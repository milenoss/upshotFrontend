import { toastr } from "react-redux-toastr";
import { asyncActionStart, asyncActionFinish, asyncActionError } from "../async/asyncActions";

export const updateProfile = (user) => 
async ( dispatch, getState, {getFirebase})=> {
    const firebase = getFirebase();
    const {isLoaded, isEmpty, ...updatedUser} = user;
    try { 
        await firebase.updateProfile(updatedUser);
        toastr.success('Success', 'Your profile has been updated')
    }   
    catch(error) {
        console.log(error)
    }
}

export const uploadProfileImage = (file, fileName) => 
      async (dispatch, getState, {getFirebase, getFirestore }) => { 
        const firebase = getFirebase(); 
        const firestore = getFirestore(); 
        const user = firebase.auth().currentUser; 
        const path = `${user.uid}/user_images`;
        const options = { 
            name: fileName
        
        };
        try { 

            dispatch(asyncActionStart());
            //upload the file to firebase storage
            let uploadedFile = await firebase.uploadFile(path, file, null, options)
            //get url of image
           
            let downloadURL = await uploadedFile.uploadTaskSnapshot.ref.getDownloadURL();

            // get userdoc 
            let userDoc = await firestore.get(`users/${user.uid}`)
            // check if user has photo, if not update profile
            if(!userDoc.data().photoURL) { 
                await firebase.updateProfile({
                    photoURL: downloadURL
                })

                await user.updateProfile({
                    photoURL: downloadURL
                })
            }
            //add the image to firestore
            await firestore.add({
                collection: 'users', 
                doc: user.uid, 
                subcollections: [{collection: 'photos'}]
            },{
                name: fileName, 
                url: downloadURL
            })
            dispatch(asyncActionFinish())
            // add the image to firestore
        } catch (error) {
            console.log(error)
            dispatch(asyncActionError())
        }

    }

export const goingToEvent = (event) => 
async (dispatch, getState, {getFirebase, getFirestore}) => { 
    const firestore = getFirestore(); 
    const firebase = getFirebase();
    const user = firebase.auth().currentUser;
    const profile = getState().firebase.profile;
    const attendee = { 
        going: true,
        joinDate: firestore.FieldValue.serverTimestamp(),
        photoURL: profile.photoURL || '/assets/user.png',
        displayName: profile.displayName,
        host: false

    }
    try { 
        await firestore.update(`events/${event.id}`, { 
            [`attendees.${user.uid}`]:attendee
        })
        await firestore.set(`event_attendee/${event.id}_${user.uid}`,{
            eventId: event.id,
            userUid: user.uid,
            eventDate: event.date,
            host: false
        })
        toastr.success('Success', 'You have signed up to the event')

    } catch(error) { 
        console.log(error)
        toastr.error('Oops', 'Problem signing up to the event')
    }
}

export const cancelGoingToEvent = (event) => 
async (dispatch, getState, { getFirestore, getFirebase}) => {
    const firestore = getFirestore(); 
    const firebase = getFirebase();
    const  user = firebase.auth().currentUser;
    try { 
        await firestore.update(`events/${event.id}`, { 
            [`attendees.${user.uid}`] : firestore.FieldValue.delete()
        })
        await firestore.delete(`event_attendees/${event.id}_${user.uid}`)
        toastr.success('Success', 'You have removed yourself from the event')
    } catch(error) { 
        console.log(error);
        toastr.error('Oops', 'Something went wrong')
    }

}