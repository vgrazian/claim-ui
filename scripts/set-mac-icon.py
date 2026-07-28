#!/usr/bin/env python3
"""Set custom icon on a macOS file using the icns data in com.apple.ResourceFork."""
import struct
import subprocess
import sys

def set_custom_icon(file_path: str, icns_path: str):
    # Read the icns data
    with open(icns_path, "rb") as f:
        icns_data = f.read()

    # Build the resource fork with icns (type 'icns', id -16455)
    # Resource fork format: header + resource map + data
    # icns resource: type = 'icns', id = -16455 (0xFFFFC059), name = ""
    # For simplicity we use the Rez format or just write raw icns

    # Write icns directly to com.apple.ResourceFork
    # The icns file is already the raw resource data
    subprocess.run(["xattr", "-w", "com.apple.ResourceFork", icns_data, file_path], check=True)

    # Set FinderInfo flag: bit 9 (kHasCustomIcon) must be set
    # Read existing FinderInfo
    result = subprocess.run(["xattr", "-p", "com.apple.FinderInfo", file_path],
                           capture_output=True)
    
    if result.returncode == 0 and result.stdout:
        finder_info = bytearray(result.stdout)
    else:
        finder_info = bytearray(32)  # 32 bytes of zeros

    # Set bit 9 of the first flags byte (byte 8, bit 1 = kHasCustomIcon)
    # FinderInfo structure: 
    #   bytes 0-7: type/creator
    #   byte 8: flags, bit 1 (0x04) = kHasCustomIcon  
    # Wait, actually the FinderInfo is 16 bytes + 16 bytes extended
    # Byte 8 (findFlags[0]): bit 1 = kHasCustomIcon = 0x04
    finder_info[8] |= 0x04

    # Write back as hex
    subprocess.run(["xattr", "-w", "-x", "com.apple.FinderInfo",
                   finder_info.hex()], check=True)

    print(f"✅ Custom icon set on: {file_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 set-icon.py <file> <icns>")
        sys.exit(1)
    set_custom_icon(sys.argv[1], sys.argv[2])
