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
#include <nan.h>

using v8::FunctionTemplate;
using v8::Handle;
using v8::Object;
using v8::String;
using Nan::GetFunction;
using Nan::New;
using Nan::Set;

NAN_METHOD(CallRest) {
    std::cout << "Not supported platform" << std::endl;
}

// NAN_METHOD is a Nan macro enabling convenient way of creating native node functions.
// Module initialization logic
NAN_MODULE_INIT(Initialize) {
    Set(target, New<String>("callRest").ToLocalChecked(),
                GetFunction(New<FunctionTemplate>(CallRest)).ToLocalChecked());
}

// Create the module called "addon" and initialize it with `Initialize` function (created with NAN_MODULE_INIT macro)
NODE_MODULE(addon, Initialize);
