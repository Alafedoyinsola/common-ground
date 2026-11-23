import { context, reddit } from '@devvit/web/server';

const FALLBACK_TEXT = `# Common Ground: The Living Watershed | Daily Challenge

Welcome to **Common Ground: The Living Watershed**, a daily cooperative ecological simulation on Reddit.

### The Objective
One island. One shared future. Every action makes a difference! Players work together each day to restore and balance the communal island ecosystem across four interdependent biomes:

- 🌲 **Forests**: Plant and nurture trees to increase biodiversity and retain critical water reserves.
- 💧 **Wetlands**: Restore marshlands and waterways to replenish pure water for the island.
- 🌾 **Farmland**: Cultivate sustainable agriculture to provide food for the community.
- 🏡 **Villages**: Support settlements to enhance community wellbeing and shelter.

### How to Play
- **2 Actions Per Player Daily**: Each player gets two restorative actions each day.
- **Shared Community Impact**: Every action directly updates today's community restoration progress and ecological balance.
- **Join Today's Effort**: Open the interactive post above and select **ENTER THE WATERSHED** to begin!
`;

export const createPost = async () => {
  const subredditName = context.subredditName;
  if (!subredditName) {
    throw new Error('Subreddit name is not available in the current context');
  }

  return await reddit.submitCustomPost({
    subredditName,
    title: 'Common Ground: The Living Watershed | Daily Challenge',
    entry: 'default',
    textFallback: {
      text: FALLBACK_TEXT,
    },
  });
};
