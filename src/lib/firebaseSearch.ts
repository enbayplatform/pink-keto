import {
    collection,
    query,
    getDocs,
    limit,
    startAfter,
    endBefore,
    where,
    orderBy,
    DocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';

interface SearchState {
    lastVisibleDocument: DocumentSnapshot | null;
    firstVisibleDocument: DocumentSnapshot | null;
    hasMore: boolean;
    hasPrevious: boolean;
}

let searchState: SearchState = {
    lastVisibleDocument: null,
    firstVisibleDocument: null,
    hasMore: true,
    hasPrevious: false
};

export const resetSearchState = () => {
    searchState = {
        lastVisibleDocument: null,
        firstVisibleDocument: null,
        hasMore: true,
        hasPrevious: false
    };
};

export const getSearchState = () => ({
    hasMore: searchState.hasMore,
    hasPrevious: searchState.hasPrevious
});

export async function searchDocuments(
    status: string | null,
    pageSize: number = 0,
    direction: 'next' | 'back' = 'next'
) {
    const user = auth.currentUser;
    if (!user) {
        console.error('User not authenticated.');
        return { documents: [], hasMore: false, hasPrevious: false };
    }

    if (!searchState.hasMore && direction === 'next') {
        return { documents: [], hasMore: false, hasPrevious: searchState.hasPrevious };
    }
    if (!searchState.hasPrevious && direction === 'back') {
        return { documents: [], hasMore: searchState.hasMore, hasPrevious: false };
    }

    try {
        // Base query with user filter and ordering
        let q = query(
            collection(db, 'documents'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        // Add status filter if specified
        if (status && status !== 'all') {
            if (status === 'unfinish') {
                q = query(q, where('status', '!=', 'complete'));
            } else {
                q = query(q, where('status', '==', status));
            }
        }

        // Add pagination
        q = query(q, limit(pageSize));

        // Add cursor based on direction
        if (direction === 'next' && searchState.lastVisibleDocument) {
            q = query(q, startAfter(searchState.lastVisibleDocument));
        } else if (direction === 'back' && searchState.firstVisibleDocument) {
            q = query(q, endBefore(searchState.firstVisibleDocument));
        }

        const querySnapshot = await getDocs(q);
        const results: any[] = [];

        if (querySnapshot.docs.length > 0) {
            searchState.firstVisibleDocument = querySnapshot.docs[0];
            searchState.lastVisibleDocument = querySnapshot.docs[querySnapshot.docs.length - 1];
        }

        querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });

        // Update pagination flags
        if (direction === 'next') {
            searchState.hasMore = querySnapshot.docs.length === pageSize;
            searchState.hasPrevious = true;
        } else if (direction === 'back') {
            searchState.hasPrevious = querySnapshot.docs.length === pageSize;
            searchState.hasMore = true;
        }

        return {
            documents: results,
            hasMore: searchState.hasMore,
            hasPrevious: searchState.hasPrevious
        };
    } catch (error) {
        console.error('Error searching documents:', error);
        return { documents: [], hasMore: false, hasPrevious: false };
    }
}

export async function loadFirstPage(status: string | null, pageSize: number = 20) {
    resetSearchState();
    return searchDocuments(status, pageSize);
}

export async function loadNextPage(status: string | null, pageSize: number = 20) {
    return searchDocuments(status, pageSize, 'next');
}

export async function loadPreviousPage(status: string | null, pageSize: number = 20) {
    return searchDocuments(status, pageSize, 'back');
}
