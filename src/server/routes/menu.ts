import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    if (!post?.id) {
      throw new Error('Post creation succeeded but did not return a valid post ID');
    }

    const subredditName = context.subredditName || post.subredditName;
    const postUrl = subredditName
      ? `https://reddit.com/r/${subredditName}/comments/${post.id}`
      : (post.url || `https://reddit.com/comments/${post.id}`);

    return c.json<UiResponse>(
      {
        navigateTo: postUrl,
      },
      200
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error creating daily challenge post: ${errorMessage}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create daily challenge post',
      },
      400
    );
  }
});
