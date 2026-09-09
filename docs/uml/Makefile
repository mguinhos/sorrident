# Renderização dos diagramas UML do SorriDent.
#
# Só precisa de Docker: o PlantUML gera SVG e PNG por conta própria.
#
#   make        gera os SVG e os PNG
#   make svg    só os SVG
#   make png    só os PNG
#   make clean  apaga o que foi gerado

UML_DIR  := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))
SRC_DIR  := $(UML_DIR)src
SVG_DIR  := $(UML_DIR)svg
PNG_DIR  := $(UML_DIR)png
PLANTUML := docker run --rm -v "$(UML_DIR)":/uml plantuml/plantuml:latest

FONTES := $(wildcard $(SRC_DIR)/*.plantuml)
SVGS   := $(patsubst $(SRC_DIR)/%.plantuml,$(SVG_DIR)/%.svg,$(FONTES)) $(SVG_DIR)/projeto.svg
PNGS   := $(patsubst $(SVG_DIR)/%.svg,$(PNG_DIR)/%.png,$(SVGS))

.PHONY: all svg png clean render FORCE

all: svg png
render: all

svg: $(SVGS)
png: $(PNGS)

# Os diagramas levam poucos segundos; forçar a regeração evita o
# "nada a ser feito" quando só o estilo mudou.
FORCE:

$(SVG_DIR)/%.svg: $(SRC_DIR)/%.plantuml FORCE
	@mkdir -p $(SVG_DIR)
	$(PLANTUML) -tsvg -o /uml/svg /uml/src/$*.plantuml

$(PNG_DIR)/%.png: $(SRC_DIR)/%.plantuml FORCE
	@mkdir -p $(PNG_DIR)
	$(PLANTUML) -tpng -o /uml/png /uml/src/$*.plantuml

# O master fica fora de src/ e o nome do arquivo vem do @startuml
$(SVG_DIR)/projeto.svg: $(UML_DIR)projeto.plantuml FORCE
	@mkdir -p $(SVG_DIR)
	$(PLANTUML) -tsvg -o /uml/svg /uml/projeto.plantuml
	mv -f $(SVG_DIR)/SorriDente-Projeto.svg $@

$(PNG_DIR)/projeto.png: $(UML_DIR)projeto.plantuml FORCE
	@mkdir -p $(PNG_DIR)
	$(PLANTUML) -tpng -o /uml/png /uml/projeto.plantuml
	mv -f $(PNG_DIR)/SorriDente-Projeto.png $@

clean:
	rm -rf $(SVG_DIR) $(PNG_DIR)
