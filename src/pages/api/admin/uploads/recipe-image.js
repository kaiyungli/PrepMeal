import crypto from 'crypto'
import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'

const supabase = supabaseServer

// Allowlist of client-declared MIME types we will mint an upload URL for,
// mapped to the extension used in the server-owned object key.
//
// NOTE: this validates only the *declared* Content-Type sent by the client.
// It does NOT inspect the actual bytes of the upload, so it is not proof that
// the stored object is really an image. SVG is deliberately excluded: it can
// carry script and is an XSS vector.
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const BUCKET = 'recipes'

export default async function handler(req, res) {
  // Fail closed: the signed-upload URL is minted with the service-role client.
  // If it is not configured, refuse before touching Storage.
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // The client declares only the MIME type. It does NOT get to choose the
  // Storage object path -- any fileName/path it sends is ignored.
  //
  // Validate before deriving the extension: `fileType` must be a string and an
  // OWN key of the allowlist. This rejects non-strings (arrays/objects, whose
  // coercion could smuggle a value past a bare lookup) and inherited
  // Object.prototype keys such as `toString`, `constructor` and `__proto__`
  // (a bare `MIME_EXTENSIONS[fileType]` would resolve those to a truthy
  // function/object).
  const { fileType } = req.body || {}
  if (typeof fileType !== 'string' || !Object.hasOwn(MIME_EXTENSIONS, fileType)) {
    return res.status(400).json({ error: 'Missing or unsupported fileType' })
  }
  const ext = MIME_EXTENSIONS[fileType]

  // Server owns the object key: the caller cannot choose the target key; a
  // random UUID makes accidental collision negligible and keeps the key
  // unguessable within the recipe-images/ prefix.
  const objectKey = `recipe-images/${crypto.randomUUID()}.${ext}`

  try {
    const { data, error: uploadError } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(objectKey)

    if (uploadError) throw uploadError

    // Same object key for the public URL so the two always agree.
    const { data: urlData } = supabase
      .storage
      .from(BUCKET)
      .getPublicUrl(objectKey)

    res.status(200).json({
      uploadUrl: data.signedUrl,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Failed to get upload URL' })
  }
}
