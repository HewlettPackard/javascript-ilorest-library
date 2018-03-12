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

#include <node.h>
#include <nan.h>
#include <ilorest.h>
#include <signal.h>
#include <cstdint>

#ifdef WINDOWS
#include <win_def.h>
#elif defined LINUX
#include <linux_def.h>
#include <execinfo.h>
#include <unistd.h>
#endif


using v8::FunctionTemplate;
using v8::String;
using Nan::GetFunction;
using Nan::New;
using Nan::Set;

extern uv_mutex_t lock;
extern MHANDLE lib_handle;


void module_exit(void*) {
    if (lib_handle) {
        // std::cout << "unload library" << std::endl;
#ifdef WINDOWS
        FreeLibrary(lib_handle);
#elif defined LINUX
        dlclose(lib_handle);
#endif
    }
    // std::cout << "destroy lock" << std::endl;
    uv_mutex_destroy(&lock);
}



void sig_handler(int sig) {
#ifdef LINUX
    void* array[10];
    size_t size;
#endif
    std::cout << "Caught signal " << sig << std::endl;
#ifdef LINUX
    size = backtrace(array, 10);
    backtrace_symbols_fd(array, size, STDERR_FILENO);
#endif
    exit(sig);
}

// Module initialization logic
NAN_MODULE_INIT(Initialize) {
    Set(target, New<String>("callRest").ToLocalChecked(),
                GetFunction(New<FunctionTemplate>(CallRest)).ToLocalChecked());
    uv_mutex_init(&lock);
#ifdef WINDOWS
    lib_handle  = LoadLibrary("ilorest_chif.dll");
#elif defined LINUX
    lib_handle = dlopen("ilorest_chif.so", RTLD_LAZY);
#endif

    signal(SIGINT, sig_handler);
    signal(SIGSEGV, sig_handler);
    signal(SIGABRT, sig_handler);
    signal(SIGILL, sig_handler);
    node::AtExit(module_exit);
}

// Create the module called "addon" and initialize it with `Initialize` function (created with NAN_MODULE_INIT macro)
NODE_MODULE(addon, Initialize);
