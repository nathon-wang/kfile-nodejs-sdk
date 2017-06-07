## 这是金山企业云盘项目Nodejs SDK

#### 安装

npm install -g kingfile

#### 直接调用SDK

var kfile = require("./lib/kfile");
var sdk = new kfile.KingFileSDK({host: ip_address, port: port, device_id: "xxxxx"});
var myAccount = sdk.account();

### 命令行模式

1. 登录
kflogin -H 192.168.140.110  -i ceshi001 -u admin -p 123456 #-f可以删除登录缓存文件，重新登录, -d选项开启调用日志

2. 上传
kfupload -i 21474836482 -t node_modules #-i指定要上传到的云端文件夹的id

3. 下载
kfdownload -i 21474836490 #-i指定要下载的云端文件（夹）的id


### 服务模式

kfservice -p 8080 -d # -d选项下开启调试模式，打印详细调用日志，并且是单进程

1. 登录
curl -i -XPOST http://localhost:8080/kfile/login\?host\=192.168.140.110\&user\=admin\&pass\=123456\&ident\=ceshi001

2. 上传
curl -i -XPOST http://localhost:8080/kfile/file/upload\?xid\=21474836482\&path\=/Users/nathon.wang/MyStudy/kfile-nodejs-sdk/bin/service.js

3. 下载
curl -i http://localhost:8080/kfile/file/download\?xid\=8589937563

如果是调用api直接登录，可以将登录后的信息写到~/.logined_info文件里，然后直接上传，下载
logined_info文件格式如下
{
    "domain_id": 1,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE0OTc0NDM0NTEsInVzZXJfaWQiOjEsImlzYSI6MTQ5NjgzODY1MSwiZGV2aWNlIjoiV0VCLTEyMzQ1NiIsImlzcyI6ImxvZ2luIn0.5IGopnRcKVLjyNE2KOmUhS9SJ9dJllNY881SyrTf5No",
    "cage_home": 8589934594,
    "first_dept": 1,
    "user_id": 1,
    "xid": 2,
    "super_type": 1,
    "staff_name": "admin",
    "email": "",
    "domain_name": "ceshi001",
    "uquota_id": 1,
    "user_name": "admin",
    "gquota_id": 1,
    "dept_id": 1,
    "is_superuser": 1,
    "share_home": 8589934593,
    "domain_ident": "ceshi001",
    "host": "192.168.140.110",
    "port": 80,
    "user_agent": "kingsoft-ecloud-web;123456;0.1.0"
}
