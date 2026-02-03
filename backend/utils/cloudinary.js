const cloudinary = require('cloudinary').v2;
const fs = require('fs');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const uploadImage = async (filePath) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary no está configurado');
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'fashion_ai',
      resource_type: 'image'
    });
    return result;
  } catch (error) {
    console.error('Error subiendo a Cloudinary:', error);
    throw error;
  }
};

const deleteImage = async (imageUrl) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return;
  }

  try {
    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error eliminando de Cloudinary:', error);
  }
};

module.exports = {
  uploadImage,
  deleteImage
};

