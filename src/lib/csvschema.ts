import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';



export interface CSVSchema {
  id: string;
  name: string;
  columns: string;
  createdAt: Date;
}

const COLLECTION_NAME = 'csvSchemas';

export const getSchemas = async (userId: string): Promise<CSVSchema[]> => {
  try {
    if (!userId) {
      console.warn('No userId provided to getSchemas');
      return [];
    }

    const schemasRef = collection(db, COLLECTION_NAME);
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));

    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return [];
      }

      const schemas: CSVSchema[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
          schemas.push({
            id: doc.id,
            name: data.name ?? '',
            columns: data.columns,
            createdAt: data.createdAt?.toDate() ?? new Date(),

          });
        }
      });
      return schemas;
    } catch (queryError) {
      //console.error('Error executing Firestore query:', queryError);
      return [];
    }
  } catch (error) {
    console.error('Error in getSchemas:', error);
    throw error;
  }
};

export const saveSchema = async (
  userId: string,
  schema: Partial<CSVSchema> & { name: string; columns: string }
): Promise<string> => {
  const schemasRef = collection(db, COLLECTION_NAME);

  const timestamp = new Date();
  const schemaData = {
    userId,
    name: schema.name,
    columns: schema.columns,
    updatedAt: timestamp,
  };

  if (schema.id) {
    // Update existing schema
    const schemaDocRef = doc(db, COLLECTION_NAME, schema.id);
    await setDoc(schemaDocRef, schemaData, { merge: true });
    return schema.id;
  } else {
    // Create new schema
    const schemaDoc = doc(schemasRef);
    await setDoc(schemaDoc, {
      ...schemaData,
      createdAt: timestamp,
    });
    return schemaDoc.id;
  }
};

export const deleteSchema = async (userId: string, schemaId: string): Promise<void> => {
  const schemaRef = doc(db, COLLECTION_NAME, schemaId);
  const schemaDoc = await getDoc(schemaRef);

  if (!schemaDoc.exists()) {
    throw new Error('Schema not found');
  }

  if (schemaDoc.data()?.userId !== userId) {
    throw new Error('Unauthorized access');
  }

  await deleteDoc(schemaRef);
};
