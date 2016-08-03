## 这是金山企业云盘项目Nodejs SDK

新建SDK

```js
var kfile = require("./lib/kfile");
var sdk = new kfile.KingFileSDK({host: ip_address, port: port, device_id: "xxxxx"});
var myAccount = sdk.account();
```
