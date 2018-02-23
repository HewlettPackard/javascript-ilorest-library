#pragma once

#ifndef LINUX_DEF_H
#define LINUX_DEF_H

#include <dlfcn.h>
#include <functional>
#include <iostream>

#define SUCCESS 0
#define CHIFERR_NoDriver 19
#define CHIFERR_AccessDenied 13

typedef void* MHANDLE;

template <typename T>
std::function<T> loadFunc(MHANDLE CHIF_HANDLE, const std::string& funcName) {
    if (NULL == CHIF_HANDLE) {
        std::cerr << "Could not load CHIF library" << std::endl;
        exit(EXIT_FAILURE);
    }

    std::function<T> func(reinterpret_cast<T*>(dlsym(CHIF_HANDLE, funcName.c_str())));
    if (!func) {
        std::cerr << "Could not locate the function \"" << funcName << "\" in shared object" << std::endl;
        exit(EXIT_FAILURE);
    }

    return func;
}
#endif
