//
//  NARoomViewController.m
//  airflick
//
//  Created by Nathan Teetor on 4/7/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NARoomViewController.h"
#import "NAColorsClass.h"
#import "UIColor+Expanded.h"

@interface NARoomViewController () <NSURLConnectionDelegate>

@property NSString *deviceID;
@property NSString *currentRoomID;
@property NSURL *serverURL;
@property NSURL *roomURL;

@property NAColorsClass *obj;

@property UIImageView *block;

@end

@implementation NARoomViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
        _obj = [NAColorsClass getInstance];
        
        self.serverURL = [[NSURL alloc] initWithString:@"http://photoplace.cs.oberlin.edu"];
        
        // get and set the device ID
        self.deviceID = [[[UIDevice currentDevice] identifierForVendor] UUIDString];
        
        UIBarButtonItem *backButton = [[UIBarButtonItem alloc] initWithTitle:@"Exit" style:UIBarButtonItemStyleBordered target:self action:@selector(back)];
        self.navigationItem.leftBarButtonItem = backButton;
        
        // set up swipe direction detectors
        UISwipeGestureRecognizer *leftSwipe = [[UISwipeGestureRecognizer alloc]
                                               initWithTarget:self
                                               action:@selector(sendTestRequest:)];
        leftSwipe.direction = UISwipeGestureRecognizerDirectionLeft;
        
        UISwipeGestureRecognizer *rightSwipe = [[UISwipeGestureRecognizer alloc]
                                                initWithTarget:self
                                                action:@selector(sendTestRequest:)];
        
        UISwipeGestureRecognizer *upSwipe = [[UISwipeGestureRecognizer alloc]
                                             initWithTarget:self
                                             action:@selector(sendTestRequest:)];
        upSwipe.direction = UISwipeGestureRecognizerDirectionUp;
        
        [self.view addGestureRecognizer:leftSwipe];
        [self.view addGestureRecognizer:rightSwipe];
        [self.view addGestureRecognizer:upSwipe];
        
        
        self.view.backgroundColor = [_obj getColor];
        
        [self connectToRoom];
    }
    return self;
}

//- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
//    // The request is complete and data has been received
//    // You can parse the stuff in your instance variable now
//    self.view.backgroundColor = [_obj getColor];
//}

- (void)back {
    [self dismissViewControllerAnimated:NO completion:nil];
}

- (void)connectToRoom {
    UIAlertView *joinRoom = [[UIAlertView alloc]
                             initWithTitle:@"Join Room"
                             message:@"Enter room ID:"
                             delegate:self
                             cancelButtonTitle:@"Cancel"
                             otherButtonTitles:@"OK",nil];
    joinRoom.alertViewStyle = UIAlertViewStylePlainTextInput;
    
    [joinRoom show];
}

- (void)alertView:(UIAlertView *)theAlert clickedButtonAtIndex:(NSInteger)buttonIndex
{
    NSLog(@"The %@ button was tapped.", [theAlert buttonTitleAtIndex:buttonIndex]);
    
    if ([theAlert.title isEqualToString:@"Join Room"]) {
        // check if the CANCEL button was clicked
        if ([[theAlert buttonTitleAtIndex:buttonIndex] isEqualToString:@"Cancel"]){
            [self back];
        } else {
            // get roomID from alert view
            NSString *roomID = [theAlert textFieldAtIndex:0].text;
            //self.navigationItem.title = [NSString stringWithFormat:@"Connected to %@",roomID];
            
            // send join room request
            NSString *roomURL = [self joinRoom:roomID :self.deviceID];
            
            self.currentRoomID = roomID;
            NSString *foo = [NSString stringWithFormat:@"http://photoplace.cs.oberlin.edu/device/room/%@",roomID];
            self.roomURL = [[NSURL alloc] initWithString:foo];
            NSLog(@"room URL is %@",self.roomURL);
            
            if ([roomURL isEqualToString:@"ERROR"]){
                // display alert if connection could be established to a room with id roomID
                [[[UIAlertView alloc] initWithTitle:@"Network Error"
                                            message:[NSString stringWithFormat:@"Could not establish connection to room with ID %@",roomID]
                                           delegate:self
                                  cancelButtonTitle:@"OK"
                                  otherButtonTitles:nil]
                 show];
            } else {
                self.navigationItem.title = [NSString stringWithFormat:@"Connected to %@",roomID];
            }
        }
    }
}

- (void)sendTestRequest:(UISwipeGestureRecognizer *)tr {
    NSString *dir = nil;
    switch ([tr direction]) {
        case UISwipeGestureRecognizerDirectionUp:
            dir = @"up";
            break;
        case UISwipeGestureRecognizerDirectionLeft:
            dir = @"left";
            break;
        case UISwipeGestureRecognizerDirectionRight:
            dir = @"right";
            break;
            
        default:
            break;
    }
    NSLog(@"swipe detected with direction: %@",dir);
    
    //NSInteger baseInt = arc4random() % 16777216;
    //NSString *hex = [NSString stringWithFormat:@"#%06X", baseInt];
    
    NSString *hex = [NSString stringWithFormat:@"#%@",[self.view.backgroundColor hexStringValue]];
    NSLog(@"%@",hex);
    
    NSDictionary *jsonDict = [NSDictionary dictionaryWithObjectsAndKeys:
                              self.deviceID,@"deviceID",
                              [NSDictionary dictionaryWithObjectsAndKeys:hex,@"color",nil],@"block",
                              dir,@"direction", nil];

    [self sendJSONtoRoom:self.currentRoomID :jsonDict];
    
    self.view.backgroundColor = [_obj getColor];
}


/* 
 * URLCONNECTION FUNCTIONS
 */

- (void)sendJSONtoRoom:(NSString *)roomPath :(NSDictionary *)dictWithJSONObject {
    NSLog(@"Sending POST request to server with JSON object:\n%@",dictWithJSONObject);
    
    NSData *jsonData = [NSJSONSerialization
                        dataWithJSONObject:dictWithJSONObject
                        options:kNilOptions
                        error:nil];
    
    NSMutableURLRequest *req = [[NSMutableURLRequest alloc] init];
    [req setURL:self.roomURL];
    [req setHTTPMethod:@"POST"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    [req setHTTPBody:jsonData];
    
    NSLog(@"room POST request to send:\n%@",req);
    
    NSURLConnection *conn = [[NSURLConnection alloc]
                             initWithRequest:req
                             delegate:self];
    
    NSLog(@"%@",conn);
}

- (NSString *)joinRoom:(NSString *)roomID :(NSString *)deviceID {
    // append /device/roomID to the server URL
    NSURL *joinRoomURL = [self.serverURL URLByAppendingPathComponent:@"/device/join"];
    NSLog(@"Joining room with URL %@",joinRoomURL);
    
    NSDictionary *dictWithJSONObject = [NSDictionary dictionaryWithObjectsAndKeys:
                                        roomID,@"roomID",
                                        deviceID,@"deviceID",
                                        nil];
    
    NSLog(@"Sending join room request to server\n%@",dictWithJSONObject);
    
    // convert the dictionary containing a JSON object into NSData
    NSData *jsonData = [NSJSONSerialization
                        dataWithJSONObject:dictWithJSONObject
                        options:kNilOptions
                        error:nil];
    
    // construct the server request
    NSMutableURLRequest *req = [[NSMutableURLRequest alloc] init];
    [req setURL:joinRoomURL];
    [req setHTTPMethod:@"POST"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    [req setHTTPBody:jsonData];
    
    // send server request
    NSURLResponse *res = nil;
    NSError *err = nil;
    NSData *reqData = [NSURLConnection
                       sendSynchronousRequest:req
                       returningResponse:&res
                       error:&err];
    
    NSLog(@"%@",reqData);
    
    if (err == nil){
        return [NSString stringWithFormat:@"%@/device/room/%@",self.serverURL,roomID];
    } else {
        return @"ERROR";
    }
}


@end
