import { useState, useEffect } from 'react';
import { CSVSchema, getSchemas, saveSchema, deleteSchema } from '@/lib/csvschema';
import { useAuth } from '@/context/AuthContext';
import { detectSchemaWithAI } from '@/lib/handlers';
import { Document } from '../lib/document';

interface SchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (schema: CSVSchema | null) => void;
  selectedDocuments: Document[];
}

export default function SchemaModal({ isOpen, onClose, onExport, selectedDocuments }: SchemaModalProps) {
  const { user } = useAuth();
  const [schemas, setSchemas] = useState<CSVSchema[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('new');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSchemaId, setEditingSchemaId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedColumns, setEditedColumns] = useState('');

  useEffect(() => {
    const loadSchemas = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);
        const loadedSchemas = await getSchemas(user.uid);
        setSchemas(loadedSchemas);

        // If no schemas exist, immediately trigger AI detection
        if (loadedSchemas.length === 0 && selectedDocuments.length > 0) {
          const detectedColumns = await detectSchemaWithAI(selectedDocuments[0].text);
          //const columnsWithTypes = detectedColumns.map(name => ({ name, type: 'string' }));
          const newSchema: Omit<CSVSchema, 'id' | 'createdAt'> = {
            name: 'Auto-detected Schema',
            columns: detectedColumns
          };

          const schemaId = await saveSchema(user.uid, newSchema);
          setSelectedSchemaId(schemaId);

          // Reload schemas to include the new one
          const updatedSchemas = await getSchemas(user.uid);
          setSchemas(updatedSchemas);
        }
      } catch (err) {
        console.error('Error loading schemas:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadSchemas();
    }
  }, [user, isOpen, selectedDocuments]);

  const handleExport = () => {
    if (selectedSchemaId === 'new') {
      onExport(null);
    } else {
      const selectedSchema = schemas.find(s => s.id === selectedSchemaId);
      if (selectedSchema) {
        onExport(selectedSchema);
      }
    }
  };

  const handleEdit = (schema: CSVSchema) => {
    setEditingSchemaId(schema.id);
    setEditedName(schema.name);
    setEditedColumns(schema.columns);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      await saveSchema(user.uid, {
        id: editingSchemaId!,
        name: editedName,
        columns: editedColumns,
      });

      // Reload schemas to get updated data
      const updatedSchemas = await getSchemas(user.uid);
      setSchemas(updatedSchemas);
      setEditingSchemaId(null);
    } catch (err) {
      console.error('Error saving schema:', err);
      setError('Failed to save schema changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingSchemaId(null);
    setEditedName('');
    setEditedColumns('');
  };

  const handleDelete = async (schemaId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this schema?')) return;

    try {
      setIsLoading(true);
      setError(null);

      await deleteSchema(user.uid, schemaId);

      // Reload schemas to get updated data
      const updatedSchemas = await getSchemas(user.uid);
      setSchemas(updatedSchemas);

      // If the deleted schema was selected, reset selection
      if (selectedSchemaId === schemaId) {
        setSelectedSchemaId('new');
      }
    } catch (err) {
      console.error('Error deleting schema:', err);
      setError('Failed to delete schema');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectSchema = async () => {
    if (!user || selectedDocuments.length === 0) {
      setError('Please select at least one document for AI detection');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const detectedColumns = await detectSchemaWithAI(selectedDocuments[0].text);
      //const columnsWithTypes = detectedColumns.map(name => ({ name, type: 'string' }));
      const newSchema: Omit<CSVSchema, 'id' | 'createdAt'> = {
        name: 'Auto-detected Schema',
        columns: detectedColumns
      };

      const schemaId = await saveSchema(user.uid, newSchema);

      // Reload schemas and select the new one
      const updatedSchemas = await getSchemas(user.uid);
      setSchemas(updatedSchemas);
      setSelectedSchemaId(schemaId);
    } catch (err) {
      console.error('Error detecting schema:', err);
      setError('Failed to detect schema');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Select Export Schema</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {schemas.length > 0 && (
            <div className="space-y-3">
              {schemas.map((schema) => (
                <div key={schema.id} className="border rounded p-3">
                  {editingSchemaId === schema.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Schema Name"
                      />
                      <textarea
                        value={editedColumns}
                        onChange={(e) => setEditedColumns(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Column names (comma-separated)"
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleSave}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                          disabled={isLoading}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value={schema.id}
                          checked={selectedSchemaId === schema.id}
                          onChange={(e) => setSelectedSchemaId(e.target.value)}
                          className="form-radio mt-1"
                        />
                        <div>
                          <span className="font-medium">{schema.name}</span>
                          <span className="text-sm text-gray-500 block">
                            {schema.columns}
                          </span>
                        </div>
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(schema)}
                          className="px-2 py-1 text-blue-500 hover:text-blue-600"
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(schema.id)}
                          className="px-2 py-1 text-red-500 hover:text-red-600"
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={handleDetectSchema}
              disabled={isLoading || selectedDocuments.length === 0}
              className={`w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 flex items-center justify-center space-x-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              <span>Detect Schema with AI</span>
            </button>
            {selectedDocuments.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 text-center">
                Select a document to enable AI detection
              </p>
            )}
          </div>

        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className={`px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
