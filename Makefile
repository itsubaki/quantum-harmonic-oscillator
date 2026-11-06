SHELL := /bin/bash
PORT ?= 3000

.PHONY: run
run:
	python3 -m http.server $(PORT) --bind 127.0.0.1 --directory public
