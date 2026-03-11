import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'
import { ensureSupabase } from '@/lib/ensureSupabase'

const supabase = supabaseServer

export default async function handler(req, res) {
  if (!ensureSupabase(res, supabase)) {
    return
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { fileName, fileType } = req.body

  if (!fileName || !fileType || !fileType.startsWith('image/')) {
    return res.status(400).json({ error: 'Invalid upload payload' })
  }

  try {
    // Generate signed URL for upload
    const { data, error: uploadError } = await supabase
      .storage
      .from('recipes')
      .createSignedUploadUrl(fileName)

    if (uploadError) throw uploadError

    // Return both the upload URL and the public URL
    const { data: urlData } = supabase
      .storage
      .from('recipes')
      .getPublicUrl(fileName)

    res.status(200).json({
      uploadUrl: data.signedUrl,
      publicUrl: urlData.publicUrl
    })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: 'Failed to get upload URL' })
  }
}
