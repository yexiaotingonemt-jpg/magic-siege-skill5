# 独立战斗服务端部署

服务端只使用Node.js内置模块和`shared/`中的规则源码，不提供网页、JS或美术资源。服务器只上传服务端包；每位玩家安装独立客户端包。使用兼容的Node.js（项目支持20.19+或22.12+）；以下普通账号守护方案还需要`flock`和运行中的cron。

## 生成与首次验证

在开发机项目根目录执行：

```sh
npm run package:server
npm run package:client -- --server https://game.example.com
```

将示例域名替换成实际服务器地址。发布目录位于`release/`；Windows还会生成ZIP和SHA-256文件。校验上传包SHA-256后，将服务端包解压到新建的版本目录，保留`server/`和`shared/`的相对层级：

```text
server/index.mjs
server/accounts.mjs
server/room.mjs
shared/                 # 规则与配置源码
deploy/
package.json
```

不需要`npm ci`、`npm run build`或`node_modules`。在包根目录首次前台验证：

```sh
KC_DATA_DIR="$HOME/magic-siege-data" HOST=127.0.0.1 PORT=5183 node server/index.mjs
```

另开终端检查`curl --fail http://127.0.0.1:5183/api/health`。返回包含`ok`、`protocolVersion`和`matchId`。访问根路径`/`返回404是预期行为，游戏页面由玩家本地客户端提供。前台验证结束后再安装下面的守护启动器，避免同时占用5183。

## 目录

```text
~/apps/magic-siege-skill5/
  releases/<版本>/       # server/、shared/、package.json和deploy/
  current -> releases/<版本>
  bin/run-user-service.sh
  shared/data/           # 持久化账号，与发布版本分开
  shared/logs/           # 运行日志
  shared/runtime/        # 进程锁和PID
```

此处根目录的`shared/data/`是运维数据目录，发布版本内的`shared/`是规则代码目录，两者分开。账号与阵营落盘；会话、战局、等级、体力、积分和临时房主配置仅在内存中，重启后重置。

首次可在独立应用目录中按以下顺序安装（`<版本>`替换成上传的版本文件夹名，目录不存在时才创建软链接）：

```sh
mkdir -p "$HOME/apps/magic-siege-skill5/bin" "$HOME/apps/magic-siege-skill5/releases" "$HOME/apps/magic-siege-skill5/shared/logs"
cd "$HOME/apps/magic-siege-skill5"
ln -s "releases/<版本>" current
cp current/deploy/run-user-service.sh bin/run-user-service.sh
chmod +x bin/run-user-service.sh
```

## 启动与恢复

将发布包内`deploy/run-user-service.sh`安装到上述`bin/`，赋予执行权限。脚本使用独占文件锁，重复运行不会开启第二个服务。默认监听`0.0.0.0:5183`，执行`server/index.mjs`。先用`command -v node`确认Node.js路径；脚本默认`/usr/bin/node`，路径不同可修改脚本默认值，或在手动启动与cron命令中同时设置`NODE_BIN`的绝对路径。

在保留账号原有其他定时任务的前提下，加入独立标记块（路径按实际账号调整）：

```cron
# BEGIN magic-siege-skill5
@reboot /home/colleague/apps/magic-siege-skill5/bin/run-user-service.sh >> /home/colleague/apps/magic-siege-skill5/shared/logs/supervisor.log 2>&1
* * * * * /home/colleague/apps/magic-siege-skill5/bin/run-user-service.sh >> /home/colleague/apps/magic-siege-skill5/shared/logs/supervisor.log 2>&1
# END magic-siege-skill5
```

安装后立即启动一次。后续开机由cron启动；进程退出后，在下一次分钟任务时恢复。部署工具需先验证`cron`正在运行，不能仅凭写入crontab宣称已开机启动。该方案不依赖用户systemd的linger或sudo。

```sh
nohup "$HOME/apps/magic-siege-skill5/bin/run-user-service.sh" </dev/null >/dev/null 2>&1 &
curl --fail http://127.0.0.1:5183/api/health
```

首次对外提供服务前，先在回环地址创建项目拥有者的首个游戏账号，避免其他访问者先取得房主。部署工具生成的账号凭据保存在操作者本机，禁止提交版本库或写入日志。

## 公网入口

独立端口需要服务器主机防火墙和云安全组允许TCP 5183。若直接端口不可达，可由管理员新增专用域名的Nginx站点代理到`127.0.0.1:5183`，SSE接口需关闭代理缓冲并设置长读取超时。普通账号不改写服务器已有站点。

SSE由Node.js默认协商流式Gzip，本地客户端代理透传编码和响应体；仍需保持下方 `proxy_buffering off`。无需为此修改客户端包或降低同步频率。回退时在启动服务的环境中设置 `MAGIC_SSE_GZIP=0`，重启服务生效；使用cron守护时也要在cron启动命令中保留该变量，避免下次拉起时恢复默认。

在已配置TLS的独立域名站点中使用以下代理配置：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5183;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
}
location / {
    return 404;
}
```

客户端配置的`serverUrl`填写该域名的HTTPS地址，不带`/api`。使用Nginx时可将服务监听设置为127.0.0.1，仅开放443。客户端本地代理会流式转发SSE，远端证书验证保持开启。

## 玩家分发与版本更新

把桌面客户端ZIP发给玩家，完整解压后双击根目录`魔法王座.exe`。Windows包附带完整桌面运行环境，玩家无需安装Node.js或浏览器，也无需运行CMD。图片和脚本留在玩家电脑上；服务器只接收API请求。不要把服务端包或账号文件发给玩家。

更新客户端时退出旧版游戏，完整解压新包后再启动。每次发布均递增`shared/protocol.js`中的`GAME_VERSION`，重新构建并同步更新两端；接口、命令或快照不兼容时另外递增`PROTOCOL_VERSION`。客户端发布版本与协议版本必须均匹配，缺失版本号也拒绝连接并要求更新。当前每个进程拥有独立战局，只能运行单实例，不能直接开启多进程负载均衡。

## 运维检查

- 健康检查：`GET /api/health`。
- 运行日志：`shared/logs/server.log`；启动器错误：`shared/logs/supervisor.log`。
- 发布前校验上传包SHA-256，版本目录不覆盖已存在的发布。
- 停止服务前先移除本项目cron标记块，再向经过命令行及属主核对的本项目PID发送TERM；否则下一分钟会自动恢复。
- 更新或回滚前备份账号数据；切换`current`后重启并复查健康、通过本地客户端登录及SSE同步。不要将账号数据放入发布包。

## 版本探测与接口调用

`GET /api/version`返回`gameVersion`和`protocolVersion`，无需登录。`GET /api/health`也包含相同版本信息。其他API必须携带`X-Magic-Version`与`X-Magic-Protocol`请求头；浏览器EventSource通过`clientVersion`和`protocolVersion`查询参数传递。头与参数同时存在时必须全部匹配。版本不符返回409及`CLIENT_UPDATE_REQUIRED`，包含`requiredVersion`。监控健康检查不受版本限制。

客户端打包检查`client/dist/client-version.json`是否对应当前源码版本，旧构建必须重新运行`npm run build`。发布目录名和包内`VERSION.json`标明两端版本。不能只升级服务器后继续使用旧客户端包。

桌面客户端默认自动连接 `http://124.222.216.66:5183`，不向玩家提供服务器设置入口，不读取旧个人地址或EXE旁的地址配置。桌面版0.3.0搭配同版本服务器。
