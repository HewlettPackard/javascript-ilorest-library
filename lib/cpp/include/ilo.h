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

#pragma once

#ifndef ILO_H
#define ILO_H

#ifdef WINDOWS
#include <win_def.h>
#elif defined LINUX
#include <linux_def.h>
#endif

#include <cstdint>

#define CHANNELLOOP 4
typedef unsigned long ILORCODE;
typedef unsigned char* ILOPKT;

class Ilo {
    public:
        Ilo(MHANDLE LIB_HANDLE, uint32_t timeout);
        ~Ilo();
        ILOPKT send_receive_raw(ILOPKT data, int retries, int recvSize);
        bool initialize;
    private:
        ILOPKT chif_packet_exchange(ILOPKT data, int recvSize);
        MHANDLE lib_handle;
        MHANDLE chif_handle;
};
#endif
