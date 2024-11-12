// import { Injectable } from '@angular/core';
// import { createClient, SupabaseClient } from '@supabase/supabase-js';
// import { environment } from '../../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class SupabaseService {
//   private supabase: SupabaseClient;

//   constructor() {
//     this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
//   }

//   // Example method to fetch data
//   async getData(table: string) {
//     const { data, error } = await this.supabase.from(table).select('*');
//     if (error) {
//       console.error('Error fetching data:', error);
//       return null;
//     }
//     return data;
//   }

//   // You can add more methods for insert, update, delete, etc.
// }
