#pragma once

#ifndef WIN_DEF_H
#define WIN_DEF_H

#include <windows.h>
#include <functional>
#include <string>
#include <iostream>

#define SUCCESS 0
#define CHIFERR_NoDriver 2
#define CHIFERR_AccessDenied 5

typedef HINSTANCE MHANDLE;

template <typename T>
std::function<T> loadFunc(MHANDLE CHIF_HANDLE, const std::string& funcName) {
    if (NULL == CHIF_HANDLE) {
        std::cerr << "Could not load CHIF library" << std::endl;
        exit(EXIT_FAILURE);
    }

    FARPROC lpfnGetProcessID = GetProcAddress(CHIF_HANDLE, funcName.c_str());

    if (!lpfnGetProcessID) {
        std::cerr << "Could not locate the function \"" << funcName << "\" in DLL" << std::endl;
        exit(EXIT_FAILURE);
    }

    std::function<T> func(reinterpret_cast<T*>(lpfnGetProcessID));

    return func;
}
#endif
