import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  templateUrl: './add-user-info.component.html',
  styles: []
})
export class AddUserInfoComponent implements OnInit {
  user: any = {
    email: '',
    address: '',
    age: null,
    ic: null,
    phone_no: null
  };
  existingUser: any;
  userId: any; // Replace with actual logic to get the user ID
  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.fetchUserProfile();
  }

  async fetchUserProfile(): Promise<void>  {

    try {
      const response = await this.http.get(`${this.apiUrl}/dashboard`).toPromise();
      this.existingUser = response;
      console.log("This user: ");
      console.log(this.existingUser)
    } catch (error) {
      console.error('Error fetching user data: ', error);
    }

  }

  onSubmit() {
    console.log(this.existingUser);
      this.user = {
        user_id: this.existingUser.user.id,
        address: this.user.address, // Assuming this holds the new address
        age: this.user.age,
        ic: this.user.ic,
        phone_no: this.user.phone_no,
      };

      console.log(this.user)

      // Make the PUT request without specifying the user_id in the URL
      this.http.put(`${this.apiUrl}/update-user-profile/${this.user.user_id}`, this.user).subscribe(
        (response) => {
          console.log('Profile updated successfully:', response);
          this.router.navigate(['/dashboard']); 

          // Handle success feedback (e.g., show a message to the user)
        },
        (error) => {
          console.error('Error updating user profile:', error);
          // Handle error feedback (e.g., show an error message)
        }
      );
  }


}

