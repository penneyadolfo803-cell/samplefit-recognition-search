export async function fileToOptimizedDataUrl(file: File, maxSize = 1280): Promise<string> {
  const source = await readFile(file);
  const image = await loadImage(source);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return source;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

export async function createDemoWhiteBackgroundPreview(src: string, size = 1200): Promise<string> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    return src;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);

  const margin = Math.round(size * 0.09);
  const available = size - margin * 2;
  const scale = Math.min(available / image.width, available / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const x = Math.round((size - width) / 2);
  const y = Math.round((size - height) / 2);

  context.shadowColor = "rgba(28, 49, 66, 0.14)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 16;
  context.fillStyle = "#f8fafc";
  context.fillRect(x - 18, y - 18, width + 36, height + 36);
  context.shadowColor = "transparent";
  context.drawImage(image, x, y, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片读取失败"));
    image.src = src;
  });
}

export function formatTags(tags: string[] | undefined) {
  return (tags || []).filter(Boolean).slice(0, 6);
}
