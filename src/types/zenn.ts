//ZennAPI
export interface ZennArticle {
    id: number;
    title: string;
    slug: string;
    published_at: string;
    emoji: string;
    path: string;
    liked_count: number;
    comments_count: number;
    body_letters_count: number;
    user: {
        username: string;
        name: string;
    }
}

export interface ZennApiResponse {
    articles: ZennArticle[];
    next_page: number | null;
    total_count: number | null;
}