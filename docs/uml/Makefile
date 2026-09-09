# Makefile — renderização dos diagramas UML do SorriDente
#
# Requisitos:
#   - Docker (imagem oficial plantuml/plantuml)  -> gera os .svg
#   - Python venv com Pillow + cairosvg           -> rasteriza .png
#     (instalar com: ../../.venv/bin/pip install pillow cairosvg)
#
# Alvos:
#   make svg     -> gera docs/uml/svg/*.svg a partir de src/*.plantuml + projeto.plantuml
#   make png     -> rasteriza docs/uml/svg/*.svg -> docs/uml/png/*.png
#   make all     -> svg + png
#   make clean   -> remove svg/ e png/ gerados
#   make render  -> alias de all

UML_DIR   := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))
SRC_DIR   := $(UML_DIR)src
SVG_DIR   := $(UML_DIR)svg
PNG_DIR   := $(UML_DIR)png
PROJ_ROOT := $(abspath $(UML_DIR)/../..)
PLANTUML  := plantuml/plantuml:latest
PYTHON    := $(PROJ_ROOT)/.venv/bin/python
SCRIPT    := $(UML_DIR)tools/render_svg_to_png.py

# fontes: os fragmentos de src/ + o master projeto.plantuml
SRCS      := $(wildcard $(SRC_DIR)/*.plantuml) $(UML_DIR)projeto.plantuml
SVGS      := $(patsubst $(SRC_DIR)/%.plantuml,$(SVG_DIR)/%.svg,$(wildcard $(SRC_DIR)/*.plantuml)) \
             $(SVG_DIR)/projeto.svg
PNGS      := $(patsubst $(SVG_DIR)/%.svg,$(PNG_DIR)/%.png,$(SVGS))

.PHONY: svg png all render clean

# Os diagramas renderizam em poucos segundos; forçar a re-renderização torna
# `make svg`/`make png` previsíveis (sem "Nada a ser feito" silencioso quando
# os artefatos já estão atualizados).
FORCE:
.PHONY: FORCE

all: render
render: svg png

svg: $(SVGS)

png: $(PNGS)

# Gera cada SVG a partir do fonte correspondente (master vira projeto.svg)
$(SVG_DIR)/%.svg: $(SRC_DIR)/%.plantuml FORCE
	@mkdir -p $(SVG_DIR)
	docker run --rm -v "$(UML_DIR)":/uml $(PLANTUML) -tsvg -o /uml/svg /uml/src/$*.plantuml

$(SVG_DIR)/projeto.svg: $(UML_DIR)projeto.plantuml FORCE
	@mkdir -p $(SVG_DIR)
	docker run --rm -v "$(UML_DIR)":/uml $(PLANTUML) -tsvg -o /uml/svg /uml/projeto.plantuml
	mv -f $(SVG_DIR)/SorriDente-Projeto.svg $(SVG_DIR)/projeto.svg

# Rasteriza cada SVG -> PNG com o script Pillow/cairosvg
$(PNG_DIR)/%.png: $(SVG_DIR)/%.svg FORCE
	@mkdir -p $(PNG_DIR)
	$(PYTHON) $(SCRIPT) $(SVG_DIR)/$*.svg --out $(PNG_DIR)

clean:
	rm -rf $(SVG_DIR) $(PNG_DIR)
