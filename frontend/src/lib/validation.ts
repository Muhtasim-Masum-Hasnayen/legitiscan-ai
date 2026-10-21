export interface UploadLimits {
  maxFiles: number;
  maxBytes: number;
  allowedTypes: string[];
}

export const DEFAULT_LIMITS: UploadLimits = {
  maxFiles: 3,
  maxBytes: 10 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
};

const EXT_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function effectiveType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? "";
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

export interface FileCheck {
  accepted: File[];
  errors: string[];
}

/** Client-side pre-checks. The server re-validates everything; this just gives instant feedback. */
export function validateFiles(existing: File[], incoming: File[], limits: UploadLimits = DEFAULT_LIMITS): FileCheck {
  const accepted: File[] = [];
  const errors: string[] = [];
  const mb = Math.round(limits.maxBytes / 1024 / 1024);

  for (const file of incoming) {
    if (!limits.allowedTypes.includes(effectiveType(file))) {
      errors.push(`"${file.name}" is not a supported image. Use JPEG, PNG or WebP.`);
    } else if (file.size === 0) {
      errors.push(`"${file.name}" is empty.`);
    } else if (file.size > limits.maxBytes) {
      errors.push(`"${file.name}" is larger than ${mb} MB.`);
    } else if ([...existing, ...accepted].some((f) => sameFile(f, file))) {
      errors.push(`"${file.name}" was already added.`);
    } else if (existing.length + accepted.length >= limits.maxFiles) {
      errors.push(`You can add up to ${limits.maxFiles} photos per scan.`);
      break;
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}
