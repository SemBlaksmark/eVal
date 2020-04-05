export default {
    "default": {
      "default": {
        "override": false,
        "events": {
          "isGroup": false,
          "key": "tealium_event"
        },
        "pageNameKey": "pageName",
        "keyGroups": {
          "cookies": {
            "hidden": true,
            "keys": [
              "/^cp\\./"
            ]
          },
          "query": {
            "hidden": true,
            "keys": [
              "/^qp\\./"
            ]
          },
          "tealium": {
            "hidden": true,
            "keys": [
              "/^(ut\\.|tealium_|dom\\.)/"
            ]
          },
          "meta": {
            "hidden": true,
            "keys": [
              "/^meta\\./"
            ]
          }
        }
      }
    }
  }