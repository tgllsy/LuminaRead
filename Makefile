.PHONY: all build build-frontend build-backend test dev-frontend dev-backend clean clean-data

# 交叉编译工具链前缀：默认留空 = 直接使用系统自带 gcc/g++/ar
# 如需交叉编译可覆盖，例如：make build-backend TOOLCHAIN=/opt/toolchain/bin/x86_64-linux-gnu-
TOOLCHAIN ?=
CC_BIN := $(TOOLCHAIN)gcc
CXX_BIN := $(TOOLCHAIN)g++
AR_BIN := $(TOOLCHAIN)ar

# 默认全量构建（前端静态打包 + 嵌入 Rust 单文件静态链接极致压缩生产程序）
all: build

build: build-frontend build-backend

# 1. 前端构建：生成 dist 静态资源供 Rust 编译期 Gzip-9 预压缩嵌入
build-frontend:
	cd frontend && npm run build

# 2. 后端构建：opt-level="z" + fat LTO + Gzip-9 资源预压缩 + 静态链接 (+crt-static) + Section GC + 符号剥离
build-backend:
	cd backend && \
		CC=$(CC_BIN) \
		CXX=$(CXX_BIN) \
		AR=$(AR_BIN) \
		cargo rustc --release --bin luminaread -- \
		-C linker=$(CC_BIN) \
		-C link-arg=-Wl,--gc-sections \
		-C link-arg=-Wl,--strip-all
	cp -f backend/target/release/luminaread ./luminaread
	strip --strip-all -R .comment -R .note -R .note.ABI-tag -R .note.gnu.build-id ./luminaread 2>/dev/null || true

# 单元测试
test:
	cd backend && cargo test

# 前端独立开发
dev-frontend:
	cd frontend && npm run dev

# 后端独立运行
dev-backend:
	cd backend && cargo run

# 清理构建产物
clean:
	cd frontend && npm run clean
	cd backend && cargo clean
	rm -f luminaread

# 清理数据库与缓存
clean-data:
	rm -rf data/*.db data/*.db-wal data/*.db-shm data/pdf_cache/* data/tts_cache/* data/covers/* data/books/* data/.trash_pdf_cache
	mkdir -p data/books data/covers data/pdf_cache data/tts_cache

# 系统服务管理 (systemd)
service-install:
	chmod +x ./service.sh && ./service.sh install

service-restart:
	./service.sh restart

service-stop:
	./service.sh stop

service-status:
	./service.sh status

