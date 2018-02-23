/*
 *   (c) Copyright 2018 Hewlett Packard Enterprise Development LP

 *   Licensed under the Apache License, Version 2.0 (the "License"); you may
 *   not use this file except in compliance with the License. You may obtain
 *   a copy of the License at

 *        http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and limitations
 *   under the License.
 */

#include <iostream>
#include <string>
#include <cstring>
#include <random>
#include <iterator>
#include <algorithm>
#include <chrono>
#include <thread>
#include <uv.h>
#include <risblobstore2.h>
#include <ilo.h>

#ifdef WINDOWS
#include <win_def.h>
#elif defined LINUX
#include <linux_def.h>
#endif


using namespace std;


void randomString (string* random_string, int size) {
    const string VALID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    std::random_device rd;
    std::default_random_engine generator(rd());
    std::uniform_int_distribution<int> distribution(0,VALID_CHARS.size() - 1);
    std::generate_n(std::back_inserter(*random_string), size, [&]()
    {
        return VALID_CHARS[distribution(generator)];
    });
}


BlobStore2:: BlobStore2(MHANDLE lib_handle, uint32_t timeout): lib_handle(lib_handle), timeout(timeout) {
    // auto _DebugPrintInitialize = loadFunc<void(const char*,const char*,const char*)>(lib_handle, "_DebugPrintInitialize");
    // auto _DebugPrintSetMaxLevel = loadFunc<int(int, int)>(lib_handle, "_DebugPrintSetMaxLevel");
    // _DebugPrintInitialize("node", "/tmp/node.log", "node sdk");
    // _DebugPrintSetMaxLevel(-1, 0x000F);
    auto updaterandval = loadFunc<void(uint16_t)>(lib_handle, "updaterandval");
    auto ChifInitialize = loadFunc<void(void)>(lib_handle, "ChifInitialize");
    auto ChifIsSecurityRequired= loadFunc<int(void)>(lib_handle, "ChifIsSecurityRequired");
    auto ChifDisableSecurity= loadFunc<void(void)>(lib_handle, "ChifDisableSecurity");
    
    std::random_device rd;
    std::default_random_engine generator(rd());
    std::uniform_int_distribution<unsigned short> distribution(1,65535);
    updaterandval(distribution(generator));
    
    ChifInitialize();
    ChifDisableSecurity();
    ilo = new Ilo(lib_handle, timeout);
}

BlobStore2::~BlobStore2() {
    if (ilo) {
        delete ilo;
        ilo = NULL;
    }
}

ILOPKT BlobStore2::send_receive_raw(ILOPKT data, uint32_t recvSize) {
    ILOPKT recvPacket;

    for (int round=0; round<CHANNELLOOP; round++) {
        recvPacket = NULL;
        recvPacket = ilo->send_receive_raw(data, 1, recvSize);
        if (recvPacket != NULL) {
            break;
        }
        // remove ilo, re-initialize
        delete ilo;
        ilo = new Ilo(lib_handle, timeout);
	if (!ilo->initialize) {
            delete ilo;
            ilo = NULL;
	    break;
	}
    }
    return recvPacket;
}


ILOPKT BlobStore2::get_info(const char* key) {
    auto get_info = loadFunc<ILOPKT(const char*,const char*)>(lib_handle, "get_info");
    auto size_of_infoResponse = loadFunc<uint32_t()>(lib_handle, "size_of_infoResponse");
    auto size_of_responseHeaderBlob = loadFunc<uint32_t()>(lib_handle, "size_of_responseHeaderBlob");
    uint32_t resSize = size_of_infoResponse();
    uint32_t errorCode;
    ILOPKT infoReq;
    ILOPKT recvPacket;

    for (uint16_t i=0; i<3; i++) {
        infoReq = get_info(key, "volatile");
        recvPacket = send_receive_raw(infoReq, resSize);
        errorCode = *(uint32_t*)(recvPacket + 8);
        if (errorCode == SUCCESS || errorCode == NOTMODIFIED) {
            break;
        }
        std::cerr << "iLO error " << errorCode << endl;
        delete []recvPacket;
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    if (errorCode != SUCCESS && errorCode != NOTMODIFIED) {
        std::cerr << "iLO error " << errorCode << endl;
        return NULL;
    }
    return recvPacket + size_of_responseHeaderBlob();
}


ILOPKT BlobStore2::read_fragment(const char* key, uint32_t offset, uint32_t count) {
    auto size_of_readResponse = loadFunc<uint32_t()>(lib_handle, "size_of_readResponse");
    auto read_fragment = loadFunc<ILOPKT(uint32_t, uint32_t, const char*, const char*)>(lib_handle, "read_fragment");
    uint32_t responseSize = size_of_readResponse();
    
    ILOPKT reqPkt = read_fragment(offset, count, key, "volatile");
    ILOPKT recvPkt = send_receive_raw(reqPkt, responseSize);

    return recvPkt;
}


ILOPKT BlobStore2::write_fragment(const char* key, char* data, uint32_t offset, uint32_t count) {
    auto write_fragment = loadFunc<ILOPKT(uint32_t, uint32_t, const char*, const char*)>(lib_handle, "write_fragment");
    auto size_of_writeRequest = loadFunc<uint32_t()>(lib_handle, "size_of_writeRequest");
    auto size_of_writeResponse = loadFunc<uint32_t()>(lib_handle, "size_of_writeResponse");
    uint32_t reqSize = size_of_writeRequest();
    uint32_t resSize = size_of_writeResponse();

    ILOPKT writeReq = write_fragment(offset, count, key, "volatile");
    ILOPKT writePkt = new unsigned char[reqSize + count];
    memcpy(writePkt, writeReq, reqSize);
    memcpy(writePkt + reqSize, data, count);
    ILOPKT resPkt = send_receive_raw(writePkt, resSize);
    
    delete []writePkt;
    return resPkt;
}


void BlobStore2::create_blob(const char* key) {
    auto create_not_blobentry = loadFunc<ILOPKT(const char*, const char*)>(lib_handle, "create_not_blobentry");
    auto size_of_createResponse = loadFunc<uint32_t()>(lib_handle, "size_of_createResponse");
    ILOPKT createReq, resPkt;
    uint32_t errorCode;

    createReq = create_not_blobentry(key, "volatile");
    resPkt = send_receive_raw(createReq, size_of_createResponse());
    
    errorCode = *(uint32_t*)(resPkt + 8);
    if (errorCode != SUCCESS && errorCode != NOTMODIFIED) {
        std::cerr << "iLO error " << errorCode << endl;
    }
    return;
}


void BlobStore2::delete_blob(const char* key) {
    auto delete_blob = loadFunc<ILOPKT(const char*,const char*)>(lib_handle, "delete_blob");
    auto size_of_deleteResponse = loadFunc<uint32_t()>(lib_handle, "size_of_infoResponse");
    uint32_t resSize = size_of_deleteResponse();
    uint32_t errorCode;

    ILOPKT deleteReq;
    ILOPKT resPkt;

    for (uint16_t i=0; i<3; i++) {
        deleteReq = delete_blob(key, "volatile");
        resPkt = send_receive_raw(deleteReq, resSize);
        errorCode = *(uint32_t*)(resPkt + 8);
        if (errorCode == SUCCESS || errorCode == NOTMODIFIED) {
            break;
        }
        std::cerr << "iLO error " << errorCode << endl;
        delete []resPkt;
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    if (errorCode != SUCCESS && errorCode != NOTMODIFIED) {
        std::cerr << "iLO error " << errorCode << endl;
    }
    return;
}


void BlobStore2::finalize(const char* key) {
    auto finalize_blob = loadFunc<ILOPKT(const char*, const char*)>(lib_handle, "finalize_blob");
    auto size_of_finalizeResponse = loadFunc<uint32_t()>(lib_handle, "size_of_finalizeResponse");
    ILOPKT finalizeReq, resPkt;
    uint32_t errorCode;

    finalizeReq = finalize_blob(key, "volatile");
    resPkt = send_receive_raw(finalizeReq, size_of_finalizeResponse());
    
    errorCode = *(uint32_t*)(resPkt + 8);    
    if (errorCode != SUCCESS && errorCode != NOTMODIFIED) {
        std::cerr << "finalize error" << endl;
        std::cerr << "iLO error " << errorCode << endl;
    }
    delete []resPkt;
    return;
};


void BlobStore2::write_blob(const char* key, char* data, uint32_t dataLen) {
    // auto max_write_size = loadFunc<uint32_t()>(lib_handle, "max_write_size");
    auto size_of_writeRequest = loadFunc<uint32_t()>(lib_handle, "size_of_writeRequest");
    
    // uint32_t maxSize = max_write_size();
    uint32_t maxSize = 3500;
    uint32_t reqSize = size_of_writeRequest();

    if (data != NULL) {
        uint32_t bytesWritten = 0;
        while (bytesWritten < dataLen) {
            uint32_t count = std::min(maxSize-reqSize, dataLen-bytesWritten);
            uint32_t errorCode = 0xffff;
            
            ILOPKT resPkt = write_fragment(key, data + bytesWritten, bytesWritten, count);
            if (resPkt != NULL) {
                errorCode = *(uint32_t*)(resPkt + 8);
            }
            if (resPkt == NULL || (errorCode != SUCCESS && errorCode != NOTMODIFIED)) {
                std::cerr << "iLO write error " << errorCode << " written " << bytesWritten << endl;
                delete []resPkt;
                break;
            }
            bytesWritten += count;
            delete []resPkt;
        }
        finalize(key);
    }
}

char* BlobStore2::read_blob(const char* key, uint32_t* size) {
    // auto max_read_size = loadFunc<uint32_t()>(lib_handle, "max_read_size");
    auto size_of_readRequest = loadFunc<uint32_t()>(lib_handle, "size_of_readRequest");
    auto size_of_responseHeaderBlob = loadFunc<uint32_t()>(lib_handle, "size_of_responseHeaderBlob");
    // uint32_t maxRead = max_read_size();
#ifdef WINDOWS
    uint32_t maxRead = 3996;
#elif defined LINUX
    uint32_t maxRead = 4000;
#endif
    uint32_t reqSize = size_of_readRequest();
    uint32_t readHead = size_of_responseHeaderBlob();
    uint32_t blobSize;
    uint32_t bytesRead = 0;
    char* response = NULL;
    ILOPKT recvPkt = NULL;
    
    *size = 0;
    ILOPKT infoPkt = get_info(key);
    if (infoPkt != NULL) {
        blobSize = *(uint32_t*)(infoPkt);
        response = new char[blobSize];
        while (bytesRead < blobSize) {
            uint32_t count = std::min(maxRead-reqSize, blobSize-bytesRead);
            recvPkt = read_fragment(key, bytesRead, count);
        
            if (recvPkt != NULL) {
                uint32_t recvSize = *(uint32_t*)(recvPkt + readHead);
                if (recvSize > 0) {
                    recvSize = std::min(count, recvSize);
                    memcpy(response + bytesRead, recvPkt + readHead + 4, recvSize);
                    bytesRead += recvSize;
                }
                else {
                    std::cerr << "Blob read error:" << endl;
                    std::cerr << "blob size " << blobSize << " bytes read " << bytesRead << endl;
                    delete []response;
                    delete []recvPkt;
                    break;
                }
                delete []recvPkt;
            }
        }
        *size = bytesRead;
    }    

    return response;
}

char* BlobStore2::rest_immediate(char *data, uint32_t dataLen, uint32_t* size) {
    auto size_of_restResponse = loadFunc<uint32_t()>(lib_handle, "size_of_restResponse");
    auto size_of_restResponseFixed = loadFunc<uint32_t()>(lib_handle, "size_of_restResponseFixed");
    auto size_of_restImmediateRequest = loadFunc<uint32_t()>(lib_handle, "size_of_restImmediateRequest");
    auto max_write_size = loadFunc<uint32_t()>(lib_handle, "max_write_size");
    uint32_t reqSize = size_of_restImmediateRequest();
    uint32_t resFixedLen = size_of_restResponseFixed();
    uint32_t errorCode, recvMode;
    bool blobMode;
    char *response = NULL;
    ILOPKT reqPacket, tmpPtr;
    ILOPKT resPacket;
    string *rqtKey = new string();
    string *rspKey = new string();

    randomString(rqtKey, 10);
    randomString(rspKey, 10);

    if (dataLen < reqSize + max_write_size()) {
        auto rest_immediate = loadFunc<ILOPKT(int32_t, const char*, const char*)>(lib_handle, "rest_immediate");
        tmpPtr = rest_immediate(dataLen, rspKey->c_str(), "volatile");
        blobMode = false;
        reqPacket = new unsigned char [reqSize + dataLen];
        memcpy(reqPacket, tmpPtr, reqSize);
        memcpy(reqPacket + reqSize, data, dataLen);
    }
    else {
        auto rest_immediate_blobdesc = loadFunc<ILOPKT(const char*, const char*, const char*)>(lib_handle, "rest_immediate_blobdesc");
        auto size_of_restBlobRequest = loadFunc<uint32_t()>(lib_handle, "size_of_restBlobRequest");
        uint32_t blobReqSize = size_of_restBlobRequest();
        create_blob(rqtKey->c_str());
        write_blob(rqtKey->c_str(), data, dataLen);
        tmpPtr = rest_immediate_blobdesc(rqtKey->c_str(), rspKey->c_str(), "volatile");
        blobMode = true;
        reqPacket = new unsigned char [blobReqSize];
        memcpy(reqPacket, tmpPtr, blobReqSize);
    }
    
    resPacket = send_receive_raw(reqPacket, size_of_restResponse());
    if (resPacket != NULL) {
        errorCode = *(uint32_t*)(resPacket + 8);
        if (errorCode == NOTFOUND) {
            std::cerr << "BlobStore not found" << endl;
        }
        else { 
            recvMode = *(uint32_t*)(resPacket + 12);
            if (errorCode == SUCCESS || (errorCode == NOTMODIFIED && !blobMode)) {
                uint32_t responseSize = *(uint32_t*)(resPacket + 16);
                if (recvMode == 0) {
                    response = new char [responseSize];
                    memcpy(response, resPacket + resFixedLen, responseSize);
                    *size = responseSize;
                }
                else {
                    response = read_blob(rspKey->c_str(), size);
                }
            }
            else {
                if (recvMode == 0) {
                    std::cerr << "iLO error " << errorCode << endl;
                }
            }

        }
        delete_blob(rspKey->c_str());
        delete []reqPacket;
        delete []resPacket;
    }
    return response;
}
