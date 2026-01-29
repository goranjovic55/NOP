"""
MAC Vendor Lookup Service

Provides vendor identification from MAC address OUI (first 3 bytes).
Based on IEEE OUI database for common network device manufacturers.
"""

from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

# Common OUI prefixes (first 3 bytes of MAC address)
# Source: IEEE OUI database - top vendors by frequency
OUI_DATABASE: Dict[str, str] = {
    # Cisco Systems
    "00:00:0c": "Cisco",
    "00:01:42": "Cisco",
    "00:01:43": "Cisco",
    "00:01:63": "Cisco",
    "00:01:64": "Cisco",
    "00:01:96": "Cisco",
    "00:01:97": "Cisco",
    "00:01:c7": "Cisco",
    "00:01:c9": "Cisco",
    "00:02:16": "Cisco",
    "00:02:17": "Cisco",
    "00:02:3d": "Cisco",
    "00:02:4a": "Cisco",
    "00:02:4b": "Cisco",
    "00:02:7d": "Cisco",
    "00:02:7e": "Cisco",
    "00:02:b9": "Cisco",
    "00:02:ba": "Cisco",
    "00:02:fc": "Cisco",
    "00:02:fd": "Cisco",
    "00:03:31": "Cisco",
    "00:03:32": "Cisco",
    "00:03:6b": "Cisco",
    "00:03:6c": "Cisco",
    "00:03:9f": "Cisco",
    "00:03:a0": "Cisco",
    "00:03:e3": "Cisco",
    "00:03:e4": "Cisco",
    "00:03:fd": "Cisco",
    "00:03:fe": "Cisco",
    "00:04:27": "Cisco",
    "00:04:28": "Cisco",
    "00:04:4d": "Cisco",
    "00:04:4e": "Cisco",
    "00:04:6d": "Cisco",
    "00:04:6e": "Cisco",
    "00:04:9a": "Cisco",
    "00:04:9b": "Cisco",
    "00:04:c0": "Cisco",
    "00:04:c1": "Cisco",
    "00:04:dd": "Cisco",
    "00:04:de": "Cisco",
    "00:05:00": "Cisco",
    "00:05:01": "Cisco",
    "00:05:31": "Cisco",
    "00:05:32": "Cisco",
    "00:05:5e": "Cisco",
    "00:05:5f": "Cisco",
    "00:05:73": "Cisco",
    "00:05:74": "Cisco",
    "00:05:9a": "Cisco",
    "00:05:9b": "Cisco",
    "00:05:dc": "Cisco",
    "00:05:dd": "Cisco",
    "00:06:28": "Cisco",
    "00:06:2a": "Cisco",
    "00:06:52": "Cisco",
    "00:06:53": "Cisco",
    "00:06:7c": "Cisco",
    "00:06:c1": "Cisco",
    "00:06:d6": "Cisco",
    "00:06:d7": "Cisco",
    "00:06:f6": "Cisco",
    "00:07:0d": "Cisco",
    "00:07:0e": "Cisco",
    "00:07:4f": "Cisco",
    "00:07:50": "Cisco",
    "00:07:7d": "Cisco",
    "00:07:84": "Cisco",
    "00:07:85": "Cisco",
    "00:07:b3": "Cisco",
    "00:07:b4": "Cisco",
    "00:07:eb": "Cisco",
    "00:07:ec": "Cisco",
    "00:08:20": "Cisco",
    "00:08:21": "Cisco",
    "00:08:2f": "Cisco",
    "00:08:30": "Cisco",
    "00:08:31": "Cisco",
    "00:08:7c": "Cisco",
    "00:08:7d": "Cisco",
    "00:08:a3": "Cisco",
    "00:08:a4": "Cisco",
    "00:08:e2": "Cisco",
    "00:08:e3": "Cisco",
    "00:09:11": "Cisco",
    "00:09:12": "Cisco",
    "00:09:43": "Cisco",
    "00:09:44": "Cisco",
    "00:09:7b": "Cisco",
    "00:09:7c": "Cisco",
    "00:09:b6": "Cisco",
    "00:09:b7": "Cisco",
    "00:09:e8": "Cisco",
    "00:09:e9": "Cisco",
    "00:0a:41": "Cisco",
    "00:0a:42": "Cisco",
    "00:0a:8a": "Cisco",
    "00:0a:8b": "Cisco",
    "00:0a:b7": "Cisco",
    "00:0a:b8": "Cisco",
    "00:0a:f3": "Cisco",
    "00:0a:f4": "Cisco",
    "00:0b:45": "Cisco",
    "00:0b:46": "Cisco",
    "00:0b:5f": "Cisco",
    "00:0b:60": "Cisco",
    "00:0b:85": "Cisco",
    "00:0b:be": "Cisco",
    "00:0b:bf": "Cisco",
    "00:0b:fc": "Cisco",
    "00:0b:fd": "Cisco",
    "00:0c:30": "Cisco",
    "00:0c:31": "Cisco",
    "00:0c:85": "Cisco",
    "00:0c:86": "Cisco",
    "00:0c:ce": "Cisco",
    "00:0c:cf": "Cisco",
    "00:0d:28": "Cisco",
    "00:0d:29": "Cisco",
    "00:0d:65": "Cisco",
    "00:0d:66": "Cisco",
    "00:0d:bc": "Cisco",
    "00:0d:bd": "Cisco",
    "00:0d:ec": "Cisco",
    "00:0d:ed": "Cisco",
    "00:0e:08": "Cisco",
    "00:0e:38": "Cisco",
    "00:0e:39": "Cisco",
    "00:0e:83": "Cisco",
    "00:0e:84": "Cisco",
    "00:0e:d6": "Cisco",
    "00:0e:d7": "Cisco",
    "00:0f:23": "Cisco",
    "00:0f:24": "Cisco",
    "00:0f:34": "Cisco",
    "00:0f:35": "Cisco",
    "00:0f:8f": "Cisco",
    "00:0f:90": "Cisco",
    "00:0f:f7": "Cisco",
    "00:0f:f8": "Cisco",
    
    # Juniper Networks
    "00:05:85": "Juniper",
    "00:10:db": "Juniper",
    "00:12:1e": "Juniper",
    "00:14:f6": "Juniper",
    "00:17:cb": "Juniper",
    "00:19:e2": "Juniper",
    "00:1b:c0": "Juniper",
    "00:1d:b5": "Juniper",
    "00:1f:12": "Juniper",
    "00:21:59": "Juniper",
    "00:22:83": "Juniper",
    "00:23:9c": "Juniper",
    "00:24:dc": "Juniper",
    "00:26:88": "Juniper",
    "00:31:46": "Juniper",
    "2c:21:31": "Juniper",
    "2c:21:72": "Juniper",
    "2c:6b:f5": "Juniper",
    "3c:61:04": "Juniper",
    "3c:8a:b0": "Juniper",
    "40:a6:77": "Juniper",
    "40:b4:f0": "Juniper",
    "44:aa:50": "Juniper",
    "44:f4:77": "Juniper",
    "4c:96:14": "Juniper",
    "50:c5:8d": "Juniper",
    "54:1e:56": "Juniper",
    "54:4b:8c": "Juniper",
    "54:e0:32": "Juniper",
    "5c:45:27": "Juniper",
    "5c:5e:ab": "Juniper",
    "64:64:9b": "Juniper",
    "64:87:88": "Juniper",
    "78:19:f7": "Juniper",
    "78:fe:3d": "Juniper",
    "80:ac:ac": "Juniper",
    "80:71:1f": "Juniper",
    "84:18:88": "Juniper",
    "84:b5:9c": "Juniper",
    "84:c1:c1": "Juniper",
    "88:a2:5e": "Juniper",
    "88:e0:f3": "Juniper",
    "9c:cc:83": "Juniper",
    "a8:d0:e5": "Juniper",
    "ac:4b:c8": "Juniper",
    "b0:a8:6e": "Juniper",
    "b0:c6:9a": "Juniper",
    "cc:e1:7f": "Juniper",
    "d4:04:ff": "Juniper",
    "d8:b1:22": "Juniper",
    "dc:38:e1": "Juniper",
    "e0:07:1b": "Juniper",
    "ec:13:db": "Juniper",
    "f0:1c:2d": "Juniper",
    "f4:a7:39": "Juniper",
    "f4:b5:2f": "Juniper",
    "f8:c0:01": "Juniper",
    
    # HP / HPE / Aruba
    "00:00:c6": "HP",
    "00:01:e6": "HP",
    "00:01:e7": "HP",
    "00:02:a5": "HP",
    "00:04:ea": "HP",
    "00:08:02": "HP",
    "00:08:83": "HP",
    "00:0a:57": "HP",
    "00:0b:cd": "HP",
    "00:0d:9d": "HP",
    "00:0e:7f": "HP",
    "00:0e:b3": "HP",
    "00:0f:20": "HP",
    "00:0f:61": "HP",
    "00:10:83": "HP",
    "00:10:e3": "HP",
    "00:11:0a": "HP",
    "00:11:85": "HP",
    "00:12:79": "HP",
    "00:13:21": "HP",
    "00:14:38": "HP",
    "00:14:c2": "HP",
    "00:15:60": "HP",
    "00:16:35": "HP",
    "00:17:08": "HP",
    "00:17:a4": "HP",
    "00:18:71": "HP",
    "00:18:fe": "HP",
    "00:19:bb": "HP",
    "00:1a:4b": "HP",
    "00:1b:78": "HP",
    "00:1c:2e": "HP",
    "00:1c:c4": "HP",
    "00:1e:0b": "HP",
    "00:1f:29": "HP",
    "00:1f:fe": "HP",
    "00:21:5a": "HP",
    "00:22:64": "HP",
    "00:23:7d": "HP",
    "00:24:81": "HP",
    "00:25:61": "HP",
    "00:25:b3": "HP",
    "00:26:55": "HP",
    "00:26:f1": "HP",
    "00:27:0d": "Aruba",
    "00:0b:86": "Aruba",
    "04:bd:88": "Aruba",
    "18:64:72": "Aruba",
    "1c:28:af": "Aruba",
    "20:4c:03": "Aruba",
    "24:de:c6": "Aruba",
    "40:e3:d6": "Aruba",
    "6c:f3:7f": "Aruba",
    "70:3a:0e": "Aruba",
    "84:d4:7e": "Aruba",
    "90:4c:81": "Aruba",
    "94:b4:0f": "Aruba",
    "9c:1c:12": "Aruba",
    "a0:8c:fd": "Aruba",
    "b4:5d:50": "Aruba",
    "d8:c7:c8": "Aruba",
    
    # Dell
    "00:06:5b": "Dell",
    "00:08:74": "Dell",
    "00:0b:db": "Dell",
    "00:0d:56": "Dell",
    "00:0f:1f": "Dell",
    "00:11:43": "Dell",
    "00:12:3f": "Dell",
    "00:13:72": "Dell",
    "00:14:22": "Dell",
    "00:15:c5": "Dell",
    "00:18:8b": "Dell",
    "00:19:b9": "Dell",
    "00:1a:a0": "Dell",
    "00:1c:23": "Dell",
    "00:1d:09": "Dell",
    "00:1e:4f": "Dell",
    "00:1e:c9": "Dell",
    "00:21:9b": "Dell",
    "00:21:70": "Dell",
    "00:22:19": "Dell",
    "00:23:ae": "Dell",
    "00:24:e8": "Dell",
    "00:25:64": "Dell",
    "00:26:b9": "Dell",
    "14:18:77": "Dell",
    "14:b3:1f": "Dell",
    "14:fe:b5": "Dell",
    "18:03:73": "Dell",
    "18:66:da": "Dell",
    "18:a9:9b": "Dell",
    "18:db:f2": "Dell",
    "20:47:47": "Dell",
    "24:6e:96": "Dell",
    "24:b6:fd": "Dell",
    "28:f1:0e": "Dell",
    "34:17:eb": "Dell",
    "34:48:ed": "Dell",
    "44:a8:42": "Dell",
    "4c:76:25": "Dell",
    "50:9a:4c": "Dell",
    "54:9f:35": "Dell",
    "5c:26:0a": "Dell",
    "5c:f9:dd": "Dell",
    "64:00:6a": "Dell",
    "74:86:7a": "Dell",
    "74:e6:e2": "Dell",
    
    # Intel
    "00:02:b3": "Intel",
    "00:03:47": "Intel",
    "00:04:23": "Intel",
    "00:07:e9": "Intel",
    "00:0e:0c": "Intel",
    "00:0e:35": "Intel",
    "00:11:11": "Intel",
    "00:12:f0": "Intel",
    "00:13:02": "Intel",
    "00:13:20": "Intel",
    "00:13:ce": "Intel",
    "00:13:e8": "Intel",
    "00:15:00": "Intel",
    "00:15:17": "Intel",
    "00:16:6f": "Intel",
    "00:16:76": "Intel",
    "00:16:ea": "Intel",
    "00:16:eb": "Intel",
    "00:17:31": "Intel",
    "00:18:de": "Intel",
    "00:19:d1": "Intel",
    "00:19:d2": "Intel",
    "00:1b:21": "Intel",
    "00:1b:77": "Intel",
    "00:1c:bf": "Intel",
    "00:1c:c0": "Intel",
    "00:1d:e0": "Intel",
    "00:1d:e1": "Intel",
    "00:1e:64": "Intel",
    "00:1e:65": "Intel",
    "00:1e:67": "Intel",
    "00:1f:3b": "Intel",
    "00:1f:3c": "Intel",
    "00:20:78": "Intel",
    "00:21:5c": "Intel",
    "00:21:5d": "Intel",
    "00:21:6a": "Intel",
    "00:21:6b": "Intel",
    "00:22:fa": "Intel",
    "00:22:fb": "Intel",
    "00:24:d6": "Intel",
    "00:24:d7": "Intel",
    "00:26:c6": "Intel",
    "00:26:c7": "Intel",
    "00:27:10": "Intel",
    "00:27:11": "Intel",
    
    # VMware
    "00:0c:29": "VMware",
    "00:50:56": "VMware",
    "00:05:69": "VMware",
    "00:1c:14": "VMware",
    
    # Microsoft / Hyper-V
    "00:03:ff": "Microsoft",
    "00:0d:3a": "Microsoft",
    "00:12:5a": "Microsoft",
    "00:15:5d": "Hyper-V",
    "00:17:fa": "Microsoft",
    "00:1d:d8": "Microsoft",
    "28:18:78": "Microsoft",
    "30:59:b7": "Microsoft",
    "48:50:73": "Microsoft",
    "50:1a:c5": "Microsoft",
    "54:27:1e": "Microsoft",
    "60:45:bd": "Microsoft",
    "7c:1e:52": "Microsoft",
    "7c:ed:8d": "Microsoft",
    "98:5f:d3": "Microsoft",
    "b4:0e:de": "Microsoft",
    "c8:3f:26": "Microsoft",
    "dc:b4:c4": "Microsoft",
    
    # Apple
    "00:03:93": "Apple",
    "00:05:02": "Apple",
    "00:0a:27": "Apple",
    "00:0a:95": "Apple",
    "00:0d:93": "Apple",
    "00:10:fa": "Apple",
    "00:11:24": "Apple",
    "00:14:51": "Apple",
    "00:16:cb": "Apple",
    "00:17:f2": "Apple",
    "00:19:e3": "Apple",
    "00:1b:63": "Apple",
    "00:1c:b3": "Apple",
    "00:1d:4f": "Apple",
    "00:1e:52": "Apple",
    "00:1e:c2": "Apple",
    "00:1f:5b": "Apple",
    "00:1f:f3": "Apple",
    "00:21:e9": "Apple",
    "00:22:41": "Apple",
    "00:23:12": "Apple",
    "00:23:32": "Apple",
    "00:23:6c": "Apple",
    "00:23:df": "Apple",
    "00:24:36": "Apple",
    "00:25:00": "Apple",
    "00:25:4b": "Apple",
    "00:25:bc": "Apple",
    "00:26:08": "Apple",
    "00:26:4a": "Apple",
    "00:26:b0": "Apple",
    "00:26:bb": "Apple",
    "04:0c:ce": "Apple",
    "04:15:52": "Apple",
    "04:1e:64": "Apple",
    "04:26:65": "Apple",
    "04:48:9a": "Apple",
    "04:52:f3": "Apple",
    "04:54:53": "Apple",
    "04:69:f8": "Apple",
    "04:d3:cf": "Apple",
    "04:db:56": "Apple",
    "04:e5:36": "Apple",
    "04:f1:3e": "Apple",
    "08:00:07": "Apple",
    "08:66:98": "Apple",
    "08:6d:41": "Apple",
    "08:70:45": "Apple",
    "10:40:f3": "Apple",
    "10:93:e9": "Apple",
    "10:94:bb": "Apple",
    "10:9a:dd": "Apple",
    "10:dd:b1": "Apple",
    "14:10:9f": "Apple",
    "14:5a:05": "Apple",
    "14:8f:c6": "Apple",
    "14:99:e2": "Apple",
    "18:20:32": "Apple",
    "18:34:51": "Apple",
    "18:65:90": "Apple",
    "18:9e:fc": "Apple",
    "18:af:61": "Apple",
    "18:af:8f": "Apple",
    "18:e7:f4": "Apple",
    "18:f1:d8": "Apple",
    "1c:1a:c0": "Apple",
    "1c:36:bb": "Apple",
    "1c:5c:f2": "Apple",
    "1c:91:48": "Apple",
    "1c:ab:a7": "Apple",
    "1c:e6:2b": "Apple",
    
    # Samsung
    "00:00:f0": "Samsung",
    "00:02:78": "Samsung",
    "00:07:ab": "Samsung",
    "00:09:18": "Samsung",
    "00:0d:ae": "Samsung",
    "00:12:47": "Samsung",
    "00:12:fb": "Samsung",
    "00:13:77": "Samsung",
    "00:15:99": "Samsung",
    "00:15:b9": "Samsung",
    "00:16:32": "Samsung",
    "00:16:6b": "Samsung",
    "00:16:6c": "Samsung",
    "00:16:db": "Samsung",
    "00:17:c9": "Samsung",
    "00:17:d5": "Samsung",
    "00:18:af": "Samsung",
    "00:1a:8a": "Samsung",
    "00:1b:98": "Samsung",
    "00:1c:43": "Samsung",
    "00:1d:25": "Samsung",
    "00:1d:f6": "Samsung",
    "00:1e:7d": "Samsung",
    "00:1e:e1": "Samsung",
    "00:1e:e2": "Samsung",
    "00:1f:cc": "Samsung",
    "00:1f:cd": "Samsung",
    "00:21:19": "Samsung",
    "00:21:4c": "Samsung",
    "00:21:d1": "Samsung",
    "00:21:d2": "Samsung",
    "00:23:39": "Samsung",
    "00:23:3a": "Samsung",
    "00:23:99": "Samsung",
    "00:23:d6": "Samsung",
    "00:23:d7": "Samsung",
    "00:24:54": "Samsung",
    "00:24:90": "Samsung",
    "00:24:91": "Samsung",
    "00:24:e9": "Samsung",
    "00:25:38": "Samsung",
    "00:25:66": "Samsung",
    "00:25:67": "Samsung",
    "00:26:37": "Samsung",
    "00:26:5d": "Samsung",
    "00:26:5f": "Samsung",
    
    # Huawei
    "00:18:82": "Huawei",
    "00:1e:10": "Huawei",
    "00:22:a1": "Huawei",
    "00:25:68": "Huawei",
    "00:25:9e": "Huawei",
    "00:46:4b": "Huawei",
    "00:66:4b": "Huawei",
    "00:9a:cd": "Huawei",
    "00:e0:fc": "Huawei",
    "00:f8:1c": "Huawei",
    "04:02:1f": "Huawei",
    "04:25:c5": "Huawei",
    "04:33:89": "Huawei",
    "04:4f:4c": "Huawei",
    "04:b0:e7": "Huawei",
    "04:bd:70": "Huawei",
    "04:c0:6f": "Huawei",
    "04:f9:38": "Huawei",
    "04:fe:8d": "Huawei",
    "08:19:a6": "Huawei",
    "08:63:61": "Huawei",
    "08:7a:4c": "Huawei",
    "08:e8:4f": "Huawei",
    "0c:37:dc": "Huawei",
    "0c:45:ba": "Huawei",
    "0c:96:bf": "Huawei",
    "10:1b:54": "Huawei",
    "10:44:00": "Huawei",
    "10:47:80": "Huawei",
    "10:c6:1f": "Huawei",
    "14:30:04": "Huawei",
    "14:b9:68": "Huawei",
    "18:c5:8a": "Huawei",
    "1c:1d:67": "Huawei",
    "1c:8e:5c": "Huawei",
    "20:08:ed": "Huawei",
    "20:0b:c7": "Huawei",
    "20:2b:c1": "Huawei",
    "20:a6:80": "Huawei",
    "20:f3:a3": "Huawei",
    
    # TP-Link
    "00:27:19": "TP-Link",
    "10:fe:ed": "TP-Link",
    "14:cc:20": "TP-Link",
    "14:cf:92": "TP-Link",
    "18:a6:f7": "TP-Link",
    "18:d6:c7": "TP-Link",
    "1c:3b:f3": "TP-Link",
    "24:69:68": "TP-Link",
    "30:b5:c2": "TP-Link",
    "50:3e:aa": "TP-Link",
    "50:bd:5f": "TP-Link",
    "54:c8:0f": "TP-Link",
    "5c:e9:31": "TP-Link",
    "60:e3:27": "TP-Link",
    "64:56:01": "TP-Link",
    "64:66:b3": "TP-Link",
    "64:70:02": "TP-Link",
    "6c:5a:b5": "TP-Link",
    "74:da:38": "TP-Link",
    "78:a1:06": "TP-Link",
    "84:16:f9": "TP-Link",
    "90:f6:52": "TP-Link",
    "94:0c:6d": "TP-Link",
    "98:da:c4": "TP-Link",
    "a0:f3:c1": "TP-Link",
    "ac:84:c6": "TP-Link",
    "b0:4e:26": "TP-Link",
    "b0:95:75": "TP-Link",
    "c0:25:e9": "TP-Link",
    "c0:4a:00": "TP-Link",
    "c4:6e:1f": "TP-Link",
    "c4:e9:84": "TP-Link",
    "cc:34:29": "TP-Link",
    "d4:6e:0e": "TP-Link",
    "d8:07:b6": "TP-Link",
    "e4:d3:32": "TP-Link",
    "e8:94:f6": "TP-Link",
    "ec:08:6b": "TP-Link",
    "ec:17:2f": "TP-Link",
    "f4:ec:38": "TP-Link",
    "f8:1a:67": "TP-Link",
    "f8:d1:11": "TP-Link",
    "fc:d7:33": "TP-Link",
    
    # Netgear
    "00:09:5b": "Netgear",
    "00:0f:b5": "Netgear",
    "00:14:6c": "Netgear",
    "00:18:4d": "Netgear",
    "00:1b:2f": "Netgear",
    "00:1e:2a": "Netgear",
    "00:1f:33": "Netgear",
    "00:22:3f": "Netgear",
    "00:24:b2": "Netgear",
    "00:26:f2": "Netgear",
    "04:a1:51": "Netgear",
    "08:02:8e": "Netgear",
    "08:bd:43": "Netgear",
    "10:0c:6b": "Netgear",
    "10:0d:7f": "Netgear",
    "10:da:43": "Netgear",
    "20:0c:c8": "Netgear",
    "20:4e:7f": "Netgear",
    "28:80:88": "Netgear",
    "28:c6:8e": "Netgear",
    "2c:30:33": "Netgear",
    "2c:b0:5d": "Netgear",
    "30:46:9a": "Netgear",
    "30:b5:c2": "Netgear",
    "38:94:ed": "Netgear",
    "38:e7:d8": "Netgear",
    "3c:37:86": "Netgear",
    "40:5f:c2": "Netgear",
    "44:94:fc": "Netgear",
    "4c:60:de": "Netgear",
    "54:b8:0a": "Netgear",
    "58:ef:68": "Netgear",
    "5c:e2:8c": "Netgear",
    "6c:b0:ce": "Netgear",
    "74:44:01": "Netgear",
    "80:37:73": "Netgear",
    "84:1b:5e": "Netgear",
    "8c:3b:ad": "Netgear",
    "a0:04:60": "Netgear",
    "a0:21:b7": "Netgear",
    "a0:40:a0": "Netgear",
    "a0:63:91": "Netgear",
    "b0:39:56": "Netgear",
    "b0:7f:b9": "Netgear",
    "c0:3f:0e": "Netgear",
    "c4:04:15": "Netgear",
    "c4:3d:c7": "Netgear",
    "cc:40:d0": "Netgear",
    "cc:4e:24": "Netgear",
    "e0:46:9a": "Netgear",
    "e0:91:f5": "Netgear",
    "e4:f4:c6": "Netgear",
    "e8:fc:af": "Netgear",
    
    # Linksys / Belkin
    "00:06:25": "Linksys",
    "00:0c:41": "Linksys",
    "00:0f:66": "Linksys",
    "00:12:17": "Linksys",
    "00:13:10": "Linksys",
    "00:14:bf": "Linksys",
    "00:16:b6": "Linksys",
    "00:18:39": "Linksys",
    "00:18:f8": "Linksys",
    "00:1a:70": "Linksys",
    "00:1c:10": "Linksys",
    "00:1d:7e": "Linksys",
    "00:1e:e5": "Linksys",
    "00:21:29": "Linksys",
    "00:22:6b": "Linksys",
    "00:23:69": "Linksys",
    "00:24:b2": "Linksys",
    "00:25:9c": "Linksys",
    "20:aa:4b": "Linksys",
    "c0:56:27": "Linksys",
    "c8:d7:19": "Linksys",
    "e8:9f:80": "Linksys",
    
    # Ubiquiti
    "00:15:6d": "Ubiquiti",
    "00:27:22": "Ubiquiti",
    "04:18:d6": "Ubiquiti",
    "18:e8:29": "Ubiquiti",
    "24:5a:4c": "Ubiquiti",
    "24:a4:3c": "Ubiquiti",
    "44:d9:e7": "Ubiquiti",
    "68:72:51": "Ubiquiti",
    "74:83:c2": "Ubiquiti",
    "74:ac:b9": "Ubiquiti",
    "78:8a:20": "Ubiquiti",
    "80:2a:a8": "Ubiquiti",
    "b4:fb:e4": "Ubiquiti",
    "dc:9f:db": "Ubiquiti",
    "e0:63:da": "Ubiquiti",
    "f0:9f:c2": "Ubiquiti",
    "fc:ec:da": "Ubiquiti",
    
    # Amazon (Echo, Fire, etc.)
    "00:fc:8b": "Amazon",
    "04:e5:98": "Amazon",
    "0c:47:c9": "Amazon",
    "10:ce:a9": "Amazon",
    "14:91:82": "Amazon",
    "18:74:2e": "Amazon",
    "24:4c:e3": "Amazon",
    "34:d2:70": "Amazon",
    "38:f7:3d": "Amazon",
    "40:a2:db": "Amazon",
    "40:b4:cd": "Amazon",
    "44:65:0d": "Amazon",
    "4c:ef:c0": "Amazon",
    "50:dc:e7": "Amazon",
    "50:f5:da": "Amazon",
    "5c:41:5a": "Amazon",
    "68:37:e9": "Amazon",
    "68:54:fd": "Amazon",
    "6c:56:97": "Amazon",
    "74:75:48": "Amazon",
    "74:c2:46": "Amazon",
    "78:e1:03": "Amazon",
    "84:d6:d0": "Amazon",
    "a0:02:dc": "Amazon",
    "a4:08:ea": "Amazon",
    "ac:63:be": "Amazon",
    "b0:fc:0d": "Amazon",
    "b4:7c:9c": "Amazon",
    "c8:8f:26": "Amazon",
    "cc:f7:35": "Amazon",
    "f0:27:2d": "Amazon",
    "f0:81:73": "Amazon",
    "f0:f0:a4": "Amazon",
    "fc:65:de": "Amazon",
    
    # Google / Nest
    "00:1a:11": "Google",
    "14:c1:4e": "Google",
    "18:7a:93": "Google",
    "1c:f2:9a": "Google",
    "20:df:b9": "Google",
    "30:fd:38": "Google",
    "3c:5a:b4": "Google",
    "48:d6:d5": "Google",
    "54:60:09": "Google",
    "58:cb:52": "Google",
    "64:16:66": "Google",
    "78:4f:43": "Google",
    "94:eb:2c": "Google",
    "98:d6:f7": "Google",
    "ac:67:5d": "Google",
    "b4:d8:6e": "Google",
    "d4:61:9d": "Google",
    "d4:f5:47": "Google",
    "e4:f0:42": "Google",
    "f4:f5:d8": "Google",
    "f4:f5:e8": "Google",
    "64:0e:94": "Nest",
    "18:b4:30": "Nest",
    "64:16:66": "Nest",
    
    # Docker / Container
    "02:42": "Docker",  # Docker-generated MACs start with 02:42
    
    # Raspberry Pi Foundation
    "b8:27:eb": "Raspberry Pi",
    "dc:a6:32": "Raspberry Pi",
    "e4:5f:01": "Raspberry Pi",
    
    # QEMU / KVM
    "52:54:00": "QEMU/KVM",
    
    # Siemens (Industrial)
    "00:0e:8c": "Siemens",
    "00:1b:1b": "Siemens",
    "00:1c:06": "Siemens",
    "00:e0:b8": "Siemens",
    "08:00:06": "Siemens",
    "4c:b1:6c": "Siemens",
    "64:6e:97": "Siemens",
    "6c:2b:59": "Siemens",
    "8c:0f:6f": "Siemens",
    "a0:b3:cc": "Siemens",
    "ac:64:17": "Siemens",
    "dc:0e:a1": "Siemens",
    
    # Schneider Electric / Modicon (Industrial)
    "00:00:54": "Schneider",
    "00:80:f4": "Schneider",
    
    # Rockwell / Allen-Bradley (Industrial)
    "00:00:bc": "Rockwell",
    "00:20:31": "Rockwell",
    
    # ABB (Industrial)
    "00:1f:01": "ABB",
    "00:1f:02": "ABB",
    "00:25:31": "ABB",
    
    # Beckhoff (Industrial)
    "00:01:05": "Beckhoff",
    
    # Phoenix Contact (Industrial)
    "00:a0:45": "Phoenix",
    "00:11:40": "Phoenix",
}


def normalize_mac(mac_address: str) -> str:
    """
    Normalize MAC address to lowercase with colons.
    Handles formats: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABBCCDDEEFF
    """
    if not mac_address:
        return ""
    
    # Remove common separators and convert to lowercase
    clean = mac_address.lower().replace("-", "").replace(":", "").replace(".", "")
    
    # Ensure we have exactly 12 hex characters
    if len(clean) != 12:
        return mac_address.lower()
    
    # Format as XX:XX:XX:XX:XX:XX
    return ":".join(clean[i:i+2] for i in range(0, 12, 2))


def get_oui_prefix(mac_address: str) -> str:
    """
    Extract OUI prefix (first 3 bytes) from MAC address.
    Returns normalized format XX:XX:XX
    """
    normalized = normalize_mac(mac_address)
    if len(normalized) >= 8:  # XX:XX:XX
        return normalized[:8]
    return ""


def lookup_vendor(mac_address: str) -> Optional[str]:
    """
    Look up vendor name from MAC address OUI prefix.
    
    Args:
        mac_address: MAC address in any common format
        
    Returns:
        Vendor name if found, None otherwise
    """
    if not mac_address:
        return None
    
    # Normalize MAC for checking
    normalized = normalize_mac(mac_address)
    if not normalized or len(normalized) < 2:
        return None
    
    # Handle Docker-generated MACs (02:42:xx:xx:xx:xx)
    if normalized.startswith("02:42"):
        return "Docker"
    
    # Check for locally administered MAC (second hex digit 2, 6, A, or E)
    # These are randomly generated (VMs, Docker, etc.) - not in OUI database
    first_octet_second_nibble = normalized[1].lower()
    if first_octet_second_nibble in ('2', '6', 'a', 'e'):
        # Locally administered - identify by pattern
        if normalized[:2].lower() in ('02', '06', '0a', '0e'):
            return "Local"  # Generic locally administered
        elif normalized[:2].lower() in ('d2', 'd6', 'da', 'de'):
            return "VM/Container"  # Common VM pattern
        elif normalized[:2].lower() in ('92', '96', '9a', '9e'):
            return "VM/Container"  # Another common VM pattern
        else:
            return "Local"  # Other locally administered
    
    prefix = get_oui_prefix(mac_address)
    if not prefix:
        return None
    
    vendor = OUI_DATABASE.get(prefix)
    if vendor:
        logger.debug(f"Found vendor for {mac_address}: {vendor}")
    
    return vendor


def lookup_vendor_short(mac_address: str) -> str:
    """
    Get vendor short name (max 8 chars) for display.
    
    Args:
        mac_address: MAC address in any common format
        
    Returns:
        Short vendor name or 'Unknown'
    """
    vendor = lookup_vendor(mac_address)
    if not vendor:
        return "Unknown"
    
    # Truncate long names
    if len(vendor) > 8:
        return vendor[:8]
    return vendor


class MacVendorService:
    """Service for MAC address vendor lookups"""
    
    def __init__(self):
        self._cache: Dict[str, Optional[str]] = {}
        self._cache_hits = 0
        self._cache_misses = 0
    
    def lookup(self, mac_address: str) -> Optional[str]:
        """
        Look up vendor with caching.
        
        Args:
            mac_address: MAC address in any format
            
        Returns:
            Vendor name if found
        """
        if not mac_address:
            return None
        
        normalized = normalize_mac(mac_address)
        
        # Check cache
        if normalized in self._cache:
            self._cache_hits += 1
            return self._cache[normalized]
        
        # Lookup and cache
        self._cache_misses += 1
        vendor = lookup_vendor(mac_address)
        self._cache[normalized] = vendor
        return vendor
    
    def lookup_short(self, mac_address: str) -> str:
        """Get short vendor name for display"""
        vendor = self.lookup(mac_address)
        if not vendor:
            return "Unknown"
        return vendor[:8] if len(vendor) > 8 else vendor
    
    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        return {
            "cache_size": len(self._cache),
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "hit_rate": round(self._cache_hits / max(1, self._cache_hits + self._cache_misses) * 100, 1)
        }
    
    def clear_cache(self):
        """Clear the lookup cache"""
        self._cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0


# Global instance for use across the application
mac_vendor_service = MacVendorService()
