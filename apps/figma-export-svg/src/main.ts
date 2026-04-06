figma.showUI(__html__, { height: 480, themeColors: true, width: 320 });

figma.ui.on("message", (msg: { type: string }) => {
  if (msg.type === "message") {
    console.debug("message");
  }
});
