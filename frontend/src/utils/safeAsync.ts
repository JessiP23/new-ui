export interface SafeAsyncResult<T> {
    data: T | null;
    error: unknown;
}

export async function safeAsync<T>(operation: () => Promise<T>, onError?: (error: unknown) => void): Promise<SafeAsyncResult<T>> {
    try {
        const data = await operation();
        return { data, error: null };
    } catch (error) {
        if (onError) {
            onError(error);
        }
        return { data: null, error };
    }
}
