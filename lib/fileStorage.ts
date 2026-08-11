import { get, set, del } from 'idb-keyval';

export const storeFile = async (id: string, file: File) => {
  try {
    await set(`file-${id}`, file);
  } catch (error) {
    console.error('Failed to store file in IndexedDB:', error);
  }
};

export const getFile = async (id: string): Promise<File | null> => {
  try {
    const file = await get(`file-${id}`);
    return file instanceof File ? file : null;
  } catch (error) {
    console.error('Failed to retrieve file from IndexedDB:', error);
    return null;
  }
};

export const deleteFile = async (id: string) => {
  try {
    await del(`file-${id}`);
  } catch (error) {
    console.error('Failed to delete file from IndexedDB:', error);
  }
};
