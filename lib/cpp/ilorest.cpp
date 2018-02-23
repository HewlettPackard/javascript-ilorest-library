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

#include <nan.h>
#include <string>
#include <iostream>
#include <cstdint>
#include <chrono>
#include <thread>
#include <risblobstore2.h>


using namespace std;
using namespace Nan;
using namespace v8;

using v8::Function;
using Nan::AsyncQueueWorker;
using Nan::AsyncWorker;
using Nan::Callback;

uv_mutex_t lock;
MHANDLE lib_handle;


class reqWorker : public AsyncWorker {
    public:
        reqWorker(Callback *callback, char* reqBufferFromJs, uint32_t bufferSize, uint32_t timeout)
            : AsyncWorker(callback), reqBufferSize(bufferSize), timeout(timeout), response(NULL), resSize(0) {
            reqBuffer = new vector<char> (reqBufferFromJs, reqBufferFromJs + reqBufferSize);
        }
        ~reqWorker() {}

        vector<char>* reqBuffer;
        uint32_t reqBufferSize;
        uint32_t timeout;
        
        void Execute () {
            blob = new BlobStore2(lib_handle, timeout);
            
            while (true) {
                if (uv_mutex_trylock(&lock) >= 0)  {
                    if (blob->ilo->initialize) {
                        response = blob->rest_immediate((char*)reqBuffer->data(), reqBufferSize, &resSize);
                    }
                    uv_mutex_unlock(&lock);
                    return;
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
            }
        }

        void HandleOKCallback () {
            Nan::HandleScope scope;

            if (response != NULL) {
                buffer = Nan::NewBuffer(response, resSize);
            }
            else {
                buffer = Nan::NewBuffer(0);
            }

            v8::Local<v8::Value> argv[] = {
                buffer.ToLocalChecked()
            };

            callback->Call(1, argv);
        }
        void Destroy() {
            if (reqBuffer != NULL) {
                vector<char>().swap(*reqBuffer);
            }
            if (blob != NULL) {
                delete blob;
                blob = NULL;
            }
        }
    private:
        BlobStore2 *blob;
        char* response;
        uint32_t resSize;
        Nan::MaybeLocal<v8::Object> buffer;
};


NAN_METHOD(CallRest) {
    char *reqBufferFromJs = (char*) node::Buffer::Data(info[0]->ToObject());
    uint32_t bufferSize = info[1]->Uint32Value();
    uint32_t timeout = info[2]->Uint32Value();
    Callback *callback = new Callback(Nan::To<v8::Function>(info[3]).ToLocalChecked());

    AsyncQueueWorker(new reqWorker(callback, reqBufferFromJs, bufferSize, timeout));
}
