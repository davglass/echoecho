all:
	npm test

coverage:
	npm test --coverage
	cp -R ./coverage/lcov-report/* ../echoecho-pages/

.PHONY: coverage
