#!/bin/bash

# 导航到你的应用程序目录
cd ~/mycode/csc3.fun/

# 拉取最新代码
git pull

# 打印消息
echo "开始安装依赖"

# 安装依赖
pnpm i

# 打印消息
echo "开始构建"

# 构建项目（如果需要）
pnpm run build-pro

# 重启应用程序
pm2 reload csc3fun

# 打印消息
echo "Deployment completed successfully."
