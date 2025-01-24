// 'use client';

// import { useState, useEffect } from 'react';
// import { useAuth } from '@/context/AuthContext';
// import { storage, db } from '@/lib/firebase';
// import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
// import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
// import Image from 'next/image';

// interface UserImage {
//   id: string;
//   url: string;
//   thumbnailUrl: string;
//   createdAt: Date;
// }

// export default function ImageUpload() {
//   const { user } = useAuth();
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);
//   const [uploading, setUploading] = useState(false);
//   const [images, setImages] = useState<UserImage[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (user) {
//       loadUserImages();
//     }
//   }, [user]);

//   const loadUserImages = async () => {
//     if (!user) return;

//     try {
//       const imagesQuery = query(
//         collection(db, 'images'),
//         where('userId', '==', user.uid)
//       );
//       const querySnapshot = await getDocs(imagesQuery);
//       const userImages: UserImage[] = [];

//       querySnapshot.forEach((doc) => {
//         const data = doc.data();
//         userImages.push({
//           id: doc.id,
//           url: data.url,
//           thumbnailUrl: data.thumbnailUrl,
//           createdAt: data.createdAt.toDate(),
//         });
//       });

//       setImages(userImages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
//     } catch (err) {
//       console.error('Error loading images:', err);
//       setError('Failed to load images');
//     }
//   };

//   const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && file.type.startsWith('image/')) {
//       setSelectedFile(file);
//       setError(null);
//     } else {
//       setError('Please select a valid image file');
//       setSelectedFile(null);
//     }
//   };

//   const uploadImage = async () => {
//     if (!selectedFile || !user) return;

//     try {
//       setUploading(true);
//       setError(null);

//       // Create a unique filename
//       const filename = `${Date.now()}-${selectedFile.name}`;
//       const storageRef = ref(storage, `users/${user.uid}/images/${filename}`);

//       // Upload the file
//       await uploadBytes(storageRef, selectedFile);
//       const url = await getDownloadURL(storageRef);

//       // Create a thumbnail version of the URL (you might want to implement actual thumbnail generation)
//       const thumbnailUrl = url;

//       // Store the image metadata in Firestore
//       const imageRef = await addDoc(collection(db, 'images'), {
//         userId: user.uid,
//         url: url,
//         thumbnailUrl: thumbnailUrl,
//         filename: filename,
//         createdAt: new Date(),
//       });

//       // Add the new image to the state
//       setImages((prev) => [{
//         id: imageRef.id,
//         url: url,
//         thumbnailUrl: thumbnailUrl,
//         createdAt: new Date(),
//       }, ...prev]);

//       setSelectedFile(null);
//       // Reset the file input
//       const fileInput = document.getElementById('file-input') as HTMLInputElement;
//       if (fileInput) fileInput.value = '';
//     } catch (err) {
//       console.error('Error uploading image:', err);
//       setError('Failed to upload image');
//     } finally {
//       setUploading(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="bg-white p-6 rounded-lg shadow-md">
//         <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
//         <div className="space-y-4">
//           <input
//             id="file-input"
//             type="file"
//             accept="image/*"
//             onChange={handleFileSelect}
//             className="block w-full text-sm text-gray-500
//               file:mr-4 file:py-2 file:px-4
//               file:rounded-full file:border-0
//               file:text-sm file:font-semibold
//               file:bg-blue-50 file:text-blue-700
//               hover:file:bg-blue-100"
//           />
//           {selectedFile && (
//             <button
//               onClick={uploadImage}
//               disabled={uploading}
//               className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
//             >
//               {uploading ? 'Uploading...' : 'Upload'}
//             </button>
//           )}
//           {error && <p className="text-red-500 text-sm">{error}</p>}
//         </div>
//       </div>

//       <div className="bg-white p-6 rounded-lg shadow-md">
//         <h2 className="text-xl font-semibold mb-4">Your Images</h2>
//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//           {images.map((image) => (
//             <div key={image.id} className="relative group">
//               <div className="aspect-square relative overflow-hidden rounded-lg">
//                 <Image
//                   src={image.thumbnailUrl}
//                   alt="Uploaded image"
//                   fill
//                   className="object-cover"
//                   sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
//                 />
//               </div>
//               <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
//                 <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm">
//                   ID: {image.id}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>
//         {images.length === 0 && (
//           <p className="text-gray-500 text-center">No images uploaded yet</p>
//         )}
//       </div>
//     </div>
//   );
// }
