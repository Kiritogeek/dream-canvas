const DEFAULT_SUPABASE_URL = "https://lbiqsodnvrnxdprcucmb.supabase.co";
const BUCKET = "dreamweave";

type TemplateImageOptions = {
  cover?: boolean;
};

export function getTemplateStyleImageUrl(
  styleKey: string,
  type: string,
  options: TemplateImageOptions = {}
): string {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(
    /\/$/,
    ""
  );
  const path = `template-style-img/${styleKey}/${type}.png`;

  if (options.cover) {
    return `${baseUrl}/storage/v1/render/image/public/${BUCKET}/${path}?width=1024&height=1024&resize=cover&quality=100`;
  }

  return `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}
