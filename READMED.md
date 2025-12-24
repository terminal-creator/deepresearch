# 后端项目启动
## 启动中间件
cd backend
docker compose -f docker-compose-base.yml up -d

### 查看中间件状态
```sh
$ docker ps
CONTAINER ID   IMAGE                                                  COMMAND                  CREATED          STATUS                             PORTS                              NAMES
1ed749c8b0c2   redis:7-alpine                                         "docker-entrypoint.s…"   18 seconds ago   Up 17 seconds                      0.0.0.0:6379->6379/tcp             document-redis
8753c95d552a   docker.elastic.co/elasticsearch/elasticsearch:8.11.3   "/bin/tini -- /usr/l…"   18 seconds ago   Up 17 seconds (health: starting)   9300/tcp, 0.0.0.0:1200->9200/tcp   document-es-01
```

## 安装python依赖包
pip install -r requirements.txt

## 修改env文件
填入个人的DASHSCOPE_API_KEY，SERPER_API_KEY
SERPER_API_KEY获取方法参考：https://serper.dev/


# 临时添加环境变量
# 用您的百炼API Key代替YOUR_DASHSCOPE_API_KEY
export DASHSCOPE_API_KEY="YOUR_DASHSCOPE_API_KEY"

## 启动后端服务
python app/app_main.py


# 接口测试
### 上传文档,用于本地知识库的查询
```sh
cd backend
curl -X POST "http://localhost:8000/documents/upload"   -H "Content-Type: multipart/form-data"   -F "file=@./test/test_doc.pdf"

{"status":"success","message":"Successfully processed and inserted 25 documents","document":null,"document_id":null,"upload_response":null,"processing_details":null}
```


# 前端项目启动
npm install --legacy-peer-deps

npm run dev

