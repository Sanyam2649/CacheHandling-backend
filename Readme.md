Overview
The Multi-Level Cache System is a sophisticated caching mechanism designed to manage data across multiple cache levels with different eviction policies. It helps optimize data retrieval by balancing between faster, smaller caches and larger, slower ones.

Working Approach
The cache system is designed to handle multiple cache levels, each with its own eviction policy. The primary objectives are:

Data Storage and Retrieval:

Data is stored in the highest cache level. When the cache exceeds its capacity, items are evicted and potentially promoted to lower levels.
Retrieval starts from the highest level and works downwards. If data is found in a lower level, it is promoted to higher levels to ensure efficient access.
Eviction Policies:

LRU (Least Recently Used): Removes the least recently accessed item. This policy ensures that recently accessed items remain in the cache.
LFU (Least Frequently Used): Removes the least frequently accessed item. This policy keeps frequently used items in the cache.
Data Promotion:

When data is evicted from a cache level, it can be promoted to the lower cache level if it exists. This helps in maintaining access patterns across levels.
Dynamic Cache Management:

New cache levels can be added or removed dynamically, allowing flexible adjustment of the cache system based on performance and storage requirements.

Approach to Solve the Problem:

Design and Implementation

Cache Level Design:
Created a CacheLevel class to handle individual cache levels.

Implemented eviction policies within the CacheLevel class:
LRU: Managed using a Map to maintain the order of access.
LFU: Managed using a Map to keep track of access frequencies.

Multi-Level Cache Management:
Created a MultiLevelCache class to manage multiple CacheLevel instances.

Ensured that each CacheLevel can be linked to a lower cache level, allowing for data promotion during eviction.

Concurrency Handling:
Used async-mutex to handle concurrent access to cache levels, ensuring thread safety during read and write operations.

Command-Line Interface (CLI):
Implemented a CLI using readline to interact with the cache system.
Provided commands to add cache levels, insert and retrieve data, remove cache levels, and display cache contents.

Problem-Solving Approach:-

Initialization:
Initialized the cache system with no levels. Each new cache level added is linked to the previous level.

Eviction Handling:
Implemented eviction logic in the evict method of CacheLevel class:
For LRU, removed the oldest item based on access order.
For LFU, removed the item with the least access frequency.

Data Promotion:
On eviction from a higher cache level, promoted the evicted data to the next lower cache level if available.

Dynamic Cache Adjustment:
Allowed dynamic addition and removal of cache levels with appropriate re-linking to ensure proper data flow between levels.

Error Handling:
Implemented error handling for invalid commands and cache operations to ensure robust functionality.

Installation
To set up and run the Multi-Level Cache System, follow these steps:

Prerequisites:

Ensure that you have Node.js installed (version 12 or later).
Clone the Repository:

Clone the repository to your local machine:

https://github.com/Sanyam2649/CacheHandling-backend.git 
cd CacheHandling-backend

Install Required Packages:
npm install

Run the Application:
node cache.js
