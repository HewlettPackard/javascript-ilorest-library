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
#include <chrono>
#include <thread>
#include <ilo.h>

#ifdef WINDOWS
#include <win_def.h>
#elif defined LINUX
#include <linux_def.h>
#endif

using namespace std;

Ilo::Ilo(MHANDLE LIB_HANDLE, uint32_t timeout): initialize(false), lib_handle(LIB_HANDLE), chif_handle(0x0) {
    auto ChifInitialize = loadFunc<void(void *)>(lib_handle, "ChifInitialize");
    auto ChifCreate = loadFunc<ILORCODE(MHANDLE*)>(lib_handle, "ChifCreate");
    auto ChifPing = loadFunc<ILORCODE(MHANDLE)>(lib_handle, "ChifPing");
    auto ChifSetRecvTimeout = loadFunc<void(MHANDLE, int)>(lib_handle, "ChifSetRecvTimeout");
    
    ChifInitialize(NULL);
    ILORCODE status = ChifCreate(&chif_handle);
    if (status != SUCCESS) {
        std::cerr << "Could not create CHIF channel" << std::endl;
        initialize = false;
	return;
        // exit(EXIT_FAILURE);
    }

    status = ChifPing(chif_handle);
    if (status != SUCCESS) {
        if (status == CHIFERR_AccessDenied) {
            std::cerr << "You must be root/Administrator" << std::endl;
        }
        else if (status == CHIFERR_NoDriver) {
            std::cerr << "CHIF driver is not attached" << std::endl;
        }
        else {
            std::cerr << status << std::endl;
            std::cerr << "Error occurred while trying to open a channel to iLO" << std::endl;
            // exit(EXIT_FAILURE);
        }
        initialize = false;
	return;
    }
    
    ChifSetRecvTimeout(chif_handle, timeout);
    initialize = true;
}

Ilo::~Ilo() {
    auto ChifClose = loadFunc<ILORCODE(MHANDLE)>(lib_handle, "ChifClose");
    ILORCODE status = ChifClose(chif_handle);
    // cout << status << endl;
    // cout << "Close iLO channel" << endl;
    if (status != 0) {
        std::cerr << "Error closing iLO channel" << endl;
    }
}

ILOPKT Ilo::chif_packet_exchange(ILOPKT data, int recvSize) {
    auto ChifPacketExchange = loadFunc<ILORCODE(MHANDLE, ILOPKT, ILOPKT, int)>(lib_handle, "ChifPacketExchange");

    ILOPKT receivePkt = new unsigned char [recvSize];
    ILORCODE status = ChifPacketExchange(chif_handle, data, receivePkt, recvSize);
    if (status != SUCCESS) {
        std::cerr << status << std::endl;
        std::cerr << "Error occurred while exchange chif packet" << std::endl;
        delete []receivePkt;
    }
    return receivePkt;
}

ILOPKT Ilo::send_receive_raw(ILOPKT data, int retries, int recvSize) {
    ILOPKT receivePkt = NULL;
    uint16_t reqSequence = *(uint16_t*)(data + 2);
    
    for (int tries=0; tries<retries; tries++) {
        receivePkt = chif_packet_exchange(data, recvSize);
        if (receivePkt != NULL && reqSequence == *(uint16_t*)(receivePkt + 2)) {
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
    return receivePkt;
}
