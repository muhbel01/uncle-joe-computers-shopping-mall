"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type StoredImage = { id: string; storage_path: string; alt_text: string | null; url: string };

export function ProductImageManager({ productId, productName }: { productId: string; productName: string }) {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshImages() {
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("product_images")
      .select("id,storage_path,alt_text")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    if (loadError) {
      setError("Could not load product images.");
      return;
    }
    setImages((data ?? []).map((item) => ({
      ...item,
      url: supabase.storage.from("product-images").getPublicUrl(item.storage_path).data.publicUrl,
    })));
  }

  useEffect(() => {
    void refreshImages();
    // Product identity is stable for this mounted manager.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function uploadImage(formData: FormData) {
    setError("");
    setMessage("");
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG and WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = productId + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      setError("Upload failed. Check your staff role and try again.");
      setBusy(false);
      return;
    }

    const { error: recordError } = await supabase.from("product_images").insert({
      product_id: productId,
      storage_path: path,
      alt_text: productName,
      sort_order: images.length,
    });
    if (recordError) {
      await supabase.storage.from("product-images").remove([path]);
      setError("Image uploaded but could not be attached to the product. Please retry.");
      setBusy(false);
      return;
    }

    await refreshImages();
    setMessage("Image added.");
    setBusy(false);
  }

  async function removeImage(image: StoredImage) {
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const { error: recordError } = await supabase.from("product_images").delete().eq("id", image.id);
    if (recordError) {
      setError("Could not remove image record. Check your staff permissions.");
      setBusy(false);
      return;
    }
    const { error: storageError } = await supabase.storage.from("product-images").remove([image.storage_path]);
    await refreshImages();
    if (storageError) setError("Image was detached from the product, but its stored file could not be deleted.");
    else setMessage("Image removed.");
    setBusy(false);
  }

  return (
    <div className="product-image-manager">
      <details>
        <summary>Images ({images.length})</summary>
        <div className="image-manager-content">
          {images.length > 0 && <div className="product-image-thumbs">{images.map((item) => (
            <div className="product-image-thumb" key={item.id}>
              <Image src={item.url} alt={item.alt_text || productName} width={120} height={88} unoptimized />
              <button type="button" onClick={() => void removeImage(item)} disabled={busy} aria-label={"Remove image for " + productName}>Remove</button>
            </div>
          ))}</div>}
          <form action={uploadImage} className="image-upload-form">
            <label>Add JPG, PNG or WebP (max 5 MB)<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required disabled={busy} /></label>
            <button type="submit" disabled={busy}>{busy ? "Working…" : "Upload image"}</button>
          </form>
          {message && <p className="image-manager-success" role="status">{message}</p>}
          {error && <p className="image-manager-error" role="alert">{error}</p>}
        </div>
      </details>
    </div>
  );
}
