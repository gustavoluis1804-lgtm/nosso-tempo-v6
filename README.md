# Nosso Tempo V4 — Foto + Cor HEX

Versão completa do **Nosso Tempo** para Android, mantendo o modo discreto e adicionando:

- escolha de **foto da galeria** para o fundo do Live Wallpaper;
- corte automático `center crop` para preencher a tela;
- controle de **escurecimento da foto** para manter o contador legível;
- botão para remover a foto e voltar ao fundo padrão;
- cor de destaque por **seletor visual** ou por **código hexadecimal**;
- exemplos de código: `FFFFFF`, `FF6B9D`, `7C5CFF`;
- sincronização da cor entre app, prévia e Live Wallpaper;
- Live Wallpaper nativo;
- modo discreto por padrão;
- temas Discreto, Vidro, OLED, Aurora, Material e Minimal;
- personalização de posição, tamanho e transparência;
- segundos, “Desde…” e próximo marco opcionais;
- biometria opcional;
- notificações de marcos;
- backup/importação em JSON;
- Node 22 + Java 21 no GitHub Actions.

## Foto de fundo

Dentro do app toque em **Imagem de fundo** ou abra **Personalização → Imagem de fundo**.

A foto:
1. é reduzida no próprio celular para evitar arquivos gigantes;
2. é salva somente no armazenamento interno do app;
3. é lida pelo Live Wallpaper nativo;
4. recebe o nível de escurecimento escolhido no app.

## Cor por código

Em **Personalização → Estilo → Cor de destaque**, você pode:
- tocar no seletor de cor; ou
- digitar os 6 caracteres HEX, por exemplo `FF6B9D`.

O `#` já aparece ao lado do campo, então você pode digitar somente os 6 caracteres.

## Tela de bloqueio

O projeto usa Live Wallpaper. PIN, digital, senha e notificações continuam sendo controlados pelo Android.

Alguns fabricantes permitem aplicar somente na tela de bloqueio; outros permitem apenas **Tela inicial e de bloqueio**.

## APK

Workflow:
`.github/workflows/main.yml`

No GitHub:
**Actions → Gerar APK - Nosso Tempo V4 Foto e Cor → Run workflow**

Ao terminar, baixe o artefato do APK e instale no Android.

Data padrão do contador: **12/09/2026 às 16:43**.
