ifdef PROD
OUT_DIR=public
POSTCSS_CONF=src/style/config/prod/
else
OUT_DIR=public-dev
POSTCSS_CONF=src/style/config/dev/
endif

DEST_GUARD=@mkdir -p $(OUT_DIR)/static
TEST_DEST_GUARD=@mkdir -p build_test/stnm

src/static/wxSym.js: src/third_party/WorldWeatherSymbols.js
	$(DEST_GUARD)
	node script/transform_svg_to_canvas_output.js

$(OUT_DIR)/index.css: $(shell find src/style -name "*.css") $(shell find src/style/config -name "*.js")
	$(DEST_GUARD)
	@echo "Compiling public/index.css..."
	postcss src/style/index.css -o $(OUT_DIR)/index.css --config $(POSTCSS_CONF)
	@echo "done."


$(OUT_DIR)/static: $(shell find src/static) node_modules/timeago.js/dist/timeago.min.js
	$(DEST_GUARD)
	rsync -r src/static/ $(OUT_DIR)/static
	rsync -r node_modules/timeago.js/dist/timeago.min.js $(OUT_DIR)/static/timeago.min.js

$(OUT_DIR)/index.js: $(shell find src/ts -name "*.ts") src/ts/rollup.config.js src/ts/tscc.spec.json
	$(DEST_GUARD)
ifdef PROD
	yarn tscc -s src/ts
else
	rollup -c src/ts/rollup.config.js
endif

$(OUT_DIR)/index.html: src/index.html
	$(DEST_GUARD)
	rsync -r src/index.html $(OUT_DIR)/index.html

ui: $(OUT_DIR)/index.css $(OUT_DIR)/static

$(OUT_DIR): $(OUT_DIR)/index.css $(OUT_DIR)/static $(OUT_DIR)/index.js $(OUT_DIR)/index.html

build_test/stnm/index.js: $(shell find src/ts -name "*.ts") $(shell find test/stnm -name "*.ts")
	$(TEST_DEST_GUARD)
	rollup -c test/stnm/rollup.config.js -i test/stnm/index.ts -d build_test/stnm

DELIVER_SIGINT_TO_WATCH_PS = WATCH_PID=$$?; trap "sudo kill -9 $${WATCH_PID}; exit 1" INT;

watch:
	while true; do \
		make $(RULE); \
		inotifywait -qre close_write .; \
	done

liveserver:
	sudo env "PATH=$(PATH)" live-server --port=80 --host=0.0.0.0 --no-browser --quiet \
		--mount=/:./$(OUT_DIR) --watch=$(OUT_DIR)

ifndef PROD
liveserver-test:
	sudo env "PATH=$(PATH)" live-server --port=80 --host=0.0.0.0 --no-browser --quiet \
		--mount=/:./$(OUT_DIR) --mount=/test:./test --mount=/build_test:./build_test \
		--watch=$(OUT_DIR),build_test

stnmtest: $(OUT_DIR)/static
	make watch RULE=build_test/stnm/index.js & ${DELIVER_SIGINT_TO_WATCH_PS} \
	make liveserver-test

uimockup:
	make watch RULE=ui & ${DELIVER_SIGINT_TO_WATCH_PS} \
	make liveserver-test
endif

deploy:
	make watch RULE=$(OUT_DIR) & ${DELIVER_SIGINT_TO_WATCH_PS} \
	make liveserver

deploy-github:
	rsync -r public/ ../station-model-drawer.github.io
	cd ../station-model-drawer.github.io && git add . && git commit -S --amend &&\
	git push -f origin master

clean:
	rm -rf build_test public deploy

.PHONY: watch liveserver liveserver_test stnmtest uimockup deploy $(OUT_DIR)/static deploy-github

