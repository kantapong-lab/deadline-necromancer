.DEFAULT_GOAL := help
APP  := app
PORT ?= 3000
export PORT
CERT := .certs/voice.crt
KEY  := .certs/voice.key

.PHONY: help install start https ngrok cert test bots balance clean-certs

help: ## list targets
	@echo "make install      npm install"
	@echo "make start        HTTP server  -> http://localhost:3000 (mod: /mod)"
	@echo "make https        HTTPS server (voice over LAN); makes cert if missing"
	@echo "make ngrok      server + ngrok tunnel (public https URL, works from any device/network)"
	@echo "make cert         (re)generate self-signed cert for LAN IP (needs openssl)"
	@echo "make test         run test suite"
	@echo "make bots         play with bots"
	@echo "make balance      balance simulation"
	@echo "make clean-certs  delete certs"
	@echo "Override port: make start PORT=4000"

$(APP)/node_modules: $(APP)/package.json
	cd $(APP) && npm install

install: $(APP)/node_modules

start: install
	cd $(APP) && npm start

$(APP)/$(CERT):
	cd $(APP) && node tools/gen-cert.js

cert:
	cd $(APP) && node tools/gen-cert.js

https: install $(APP)/$(CERT)
	cd $(APP) && HTTPS_KEY=$(KEY) HTTPS_CERT=$(CERT) npm start

ngrok: install
	cd $(APP) && (node src/server/index.js & SRV=$$!; trap "kill $$SRV" EXIT INT TERM; ngrok http $(PORT))

test: install
	cd $(APP) && npm test

bots: install
	cd $(APP) && npm run bots

balance: install
	cd $(APP) && npm run balance

clean-certs:
	rm -rf $(APP)/.certs
