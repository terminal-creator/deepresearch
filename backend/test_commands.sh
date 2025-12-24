#!/bin/bash

# 创建会话
echo "创建新会话..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8100/chat/session)
echo $SESSION_RESPONSE

# 提取会话ID
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"session_id":"[^"]*"' | cut -d':' -f2 | tr -d '"')
echo "获取到会话ID: $SESSION_ID"

# 第一次聊天请求
echo -e "\n发送第一个问题..."
curl -N -X POST http://localhost:8100/chat/completion \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "{
    \"session_id\": \"$SESSION_ID\", 
    \"question\": \"什么是数据库迁移？\"
  }"

# 第二次聊天请求（使用相同会话ID）
echo -e "\n\n发送第二个问题（使用相同会话ID）..."
curl -N -X POST http://localhost:8100/chat/completion \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "{
    \"session_id\": \"$SESSION_ID\", 
    \"question\": \"如何解决dify_setups表不存在的问题？\"
  }"

# 无会话ID的聊天请求（会自动创建新会话）
echo -e "\n\n发送问题（不使用会话ID）..."
curl -N -X POST http://localhost:8100/chat/completion \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "question": "PostgreSQL数据库如何备份？"
  }' 