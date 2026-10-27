# 普通账号部署

服务端只使用Node.js内置模块及本地源码；前端在构建机生成`dist/`后一起上传，服务器不需要安装开发依赖。使用Node.js 22.12+、`flock`和已启用的用户crontab。

## 目录

```text
~/apps/magic-siege-skill5/
  releases/<版本>/       # 源码、package.json和已构建dist
  current -> releases/<版本>
  bin/run-user-service.sh
  shared/data/           # 持久化账号，与发布版本分开
  shared/logs/           # 运行日志
  shared/runtime/        # 进程锁和PID
```

账号只保存于`shared/data/`。更新或回滚只替换`current`指向并重启进程，保留账号；战局仍按原设计在服务重启后重新开始。

## 启动与恢复

将[启动脚本](run-user-service.sh)安装到上述`bin/`，赋予执行权限。脚本使用独占文件锁，重复运行不会开启第二个服务。默认监听`0.0.0.0:5183`。

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

## 运维检查

- 健康检查：`GET /api/health`。
- 运行日志：`shared/logs/server.log`；启动器错误：`shared/logs/supervisor.log`。
- 发布前校验上传包SHA-256，版本目录不覆盖已存在的发布。
- 停止服务前先移除本项目cron标记块，再向经过命令行及属主核对的本项目PID发送TERM；否则下一分钟会自动恢复。
- 更新或回滚前备份账号数据；切换`current`后重启并复查健康、静态资源及登录和SSE。不要将账号数据放入发布包。
