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

#ifndef RISBLOBSTORE2_H
#define RISBLOBSTORE2_H

#ifdef WINDOWS
#include <win_def.h>
#elif defined LINUX
#include <linux_def.h>
#endif
#include <cstdint>

#include <ilo.h>

#define SUCCESS 0
#define BADPARAMETER 2
#define NOTFOUND 12
#define NOTMODIFIED 20

class BlobStore2 {
    private:
        ILOPKT get_info(const char* key);
        ILOPKT read_fragment(const char *key, uint32_t offset, uint32_t count);
        ILOPKT write_fragment(const char* key, char* data, uint32_t offset, uint32_t count);
        void create_blob(const char *key);
        void delete_blob(const char *key);
        void write_blob(const char *key, char* data, uint32_t dataLen);
        char* read_blob(const char *key, uint32_t* size);
        void finalize(const char* key);
        MHANDLE lib_handle;

    public:
        const int MAX_RETRIES = 3;
        Ilo* ilo;
        BlobStore2(MHANDLE lib_handle, uint32_t timeout);
        ~BlobStore2();
        uint32_t timeout;
        ILOPKT send_receive_raw(ILOPKT data, uint32_t recvSize);
        char* rest_immediate(char* data, uint32_t dataLen, uint32_t* size);
};
#endif
