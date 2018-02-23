{
  "targets": [
    {
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
        "./lib/cpp/include"
      ],
      "target_name": "addon",
      "sources": [],
      "conditions": [
        ['OS=="linux"', {
          "sources": [
            "./lib/cpp/main.cpp",
            "./lib/cpp/ilorest.cpp",
            "./lib/cpp/risblobstore2.cpp",
            "./lib/cpp/ilo.cpp"
          ],
          "cflags": ["-std=gnu++1y", "-DLINUX"]
        }],
        ['OS=="win"', {
          "sources": [
            "./lib/cpp/main.cpp",
            "./lib/cpp/ilorest.cpp",
            "./lib/cpp/risblobstore2.cpp",
            "./lib/cpp/ilo.cpp"
          ],
          "defines": ["WINDOWS", "NOMINMAX"]
        }],
        ['OS=="mac"', {
          "sources": [
            "./lib/cpp/main_mac.cpp"
          ]
        }]
      ]
    }
  ]
}
