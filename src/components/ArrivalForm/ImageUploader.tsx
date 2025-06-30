import React from 'react';

interface ImageUploaderProps {
  imageFile: File | null;
  setImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  imageUrl: string;
  setImageUrl: React.Dispatch<React.SetStateAction<string>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function ImageUploader({
  imageFile,
  setImageFile,
  imageUrl,
  setImageUrl,
  fileInputRef,
}: ImageUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) setImageUrl(''); // Скидаємо посилання, якщо вибрано новий файл
  };

  return (
    <div>
      {imageUrl && !imageFile && (
        <div className="mb-2">
          <img src={imageUrl} alt="Поточне фото" className="max-w-xs" />
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*"
      />
    </div>
  );
}
