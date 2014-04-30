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
#import <AudioToolbox/AudioToolbox.h>
#import <AVFoundation/AVFoundation.h>

@interface NARoomViewController () <NSURLConnectionDelegate>

@property NSString *deviceID;
@property NSString *roomID;
@property NSURL *serverURL;
//@property NSURL *roomURL;

@property NSInteger numScreens;
@property NSMutableArray *screens;
@property NSMutableArray *screenColors;

@property NAColorsClass *obj;

@property int mode;

@end

@implementation NARoomViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
        _obj = [NAColorsClass getInstance];
        
        self.numScreens = 0;
        
        self.screens = [NSMutableArray new];
        
        self.screenColors = [[NSMutableArray alloc]
                             initWithObjects:_obj.color1,_obj.color2,_obj.color3,nil];

        NSLog(@"%@",self.screenColors);
        
        self.serverURL = [[NSURL alloc] initWithString:@"http://photoplace.cs.oberlin.edu"];
        
        // get and set the device ID
        self.deviceID = [[[UIDevice currentDevice] identifierForVendor] UUIDString];
        
        UIBarButtonItem *backButton = [[UIBarButtonItem alloc]
                                       initWithTitle:@"Exit"
                                       style:UIBarButtonItemStyleBordered
                                       target:self
                                       action:@selector(back)];

        self.navigationItem.leftBarButtonItem = backButton;
        
        UIBarButtonItem *setupButton = [[UIBarButtonItem alloc]
                                        initWithBarButtonSystemItem:UIBarButtonSystemItemAdd target:self
                                        action:@selector(startScreenSetup)];
        
        self.navigationItem.rightBarButtonItem = setupButton;
        
        self.view.backgroundColor = [UIColor whiteColor]; //[_obj getColor];
        
        self.mode = -1; // start/waiting mode
        
        [self connectToRoom];
    }
    return self;
}



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
    joinRoom.tag = 1;
    
    [joinRoom show];
    // the rest is handled in the alert view method!
}

- (void)alertView:(UIAlertView *)theAlert clickedButtonAtIndex:(NSInteger)buttonIndex
{
    NSLog(@"Alert %i was closed",(int)theAlert.tag);
    
    if (theAlert.tag == 1) {
        // check if the CANCEL button was clicked
        if ([[theAlert buttonTitleAtIndex:buttonIndex] isEqualToString:@"Cancel"]){
            [self back];
        } else {
            // get roomID from alert view
            self.roomID = [theAlert textFieldAtIndex:0].text;
            
            // send join room request
            NSString *roomURL = [self joinRoom:self.roomID :self.deviceID];
            
            //self.currentRoomID = roomID;
            //NSString *foo = [NSString stringWithFormat:@"http://photoplace.cs.oberlin.edu/device/room/%@",roomID];
            
            //self.roomURL = [[NSURL alloc] initWithString:foo];
            //NSLog(@"room URL is %@",self.roomURL);
            
            if ([roomURL isEqualToString:@"ERROR"]){
                // display alert if connection could be established to a room with id roomID
                [[[UIAlertView alloc] initWithTitle:@"Network Error"
                                            message:[NSString stringWithFormat:@"Could not establish connection to room with ID %@",self.roomID]
                                           delegate:self
                                  cancelButtonTitle:@"OK"
                                  otherButtonTitles:nil]
                 show];
            }
        }
    }
}

- (void)sendTestRequest {
    
    NSString *hex = [NSString stringWithFormat:@"#%@",[self.view.backgroundColor hexStringValue]];
    NSLog(@"%@",hex);
    
//    NSDictionary *jsonDict = @{@"deviceID":self.deviceID,
//                               @"block":@{@"color":hex}};

    //[self sendJSONtoPath:self.currentRoomID :jsonDict];
    
    self.view.backgroundColor = [_obj getColor];
}


/* 
 * URLCONNECTION FUNCTIONS
 */
- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    // initialize
    _responseData = [[NSMutableData alloc] init];
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    // Append the new data to the instance variable you declared
    [_responseData appendData:data];
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
    NSLog(@"(non-synched) connection did finish");
    NSError *error = nil;
    
    NSDictionary *resJSON = [NSJSONSerialization JSONObjectWithData:_responseData
                                                            options:kNilOptions
                                                              error:&error];
    
    NSLog(@"received: %@",resJSON);
    
    
    if (self.mode == -1){
        // add first screen
//        [self.screens addObject:[[NSMutableDictionary alloc]
//                                 initWithDictionary:
//                                 @{@"displayID":[resJSON valueForKey:@"displayID"],
//                                   @"point":@"NA"
//                                   }]];
        
        
        // switch to adding screens mode
        //self.mode = 0;
    }
    else if (self.mode == 0){
        // adding screens mode
        
        if ([resJSON valueForKey:@"next"] == nil){
            // no more screens to setup
            
            self.mode = 1;
        }
        else {
            // add a screen
            [self.screens addObject:[[NSMutableDictionary alloc]
                                     initWithDictionary:
                                     @{@"displayID":[resJSON valueForKey:@"displayID"],
                                       @"point":@"NA"
                                       }]];

            //[self sendDisplayRequest];
        }
    }
    
}

- (void)sendJSONtoPath:(NSString *)urlPath :(NSDictionary *)dictWithJSONObject {
    NSURL *url = [self.serverURL URLByAppendingPathComponent:urlPath];
    
    NSLog(@"Sending POST request to %@",url);
    
    NSData *jsonData = [NSJSONSerialization
                        dataWithJSONObject:dictWithJSONObject
                        options:kNilOptions
                        error:nil];
    
    NSMutableURLRequest *req = [[NSMutableURLRequest alloc] init];
    [req setURL:url];
    [req setHTTPMethod:@"POST"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    [req setHTTPBody:jsonData];
    
    NSURLConnection *conn = [[NSURLConnection alloc]
                             initWithRequest:req
                             delegate:self];
    
    NSLog(@"%@",conn);
}

- (void)startScreenSetup {
    self.mode = 0;
    [self positionDisplay];
}

- (void)positionDisplay {
    NSURL *url = [self.serverURL
                  URLByAppendingPathComponent:[NSString stringWithFormat:@"/device/room/%@/position_displays",self.roomID]];
    
    NSLog(@"Sending GET request to %@",url);
    
    NSURLRequest *req = [[NSURLRequest alloc] initWithURL:url];
    
    // send server request
    NSURLResponse *res = nil;
    NSError *err = nil;
    NSData *reqData = [NSURLConnection
                       sendSynchronousRequest:req
                       returningResponse:&res
                       error:&err];
    
    NSLog(@"positionDisplay received: %@",reqData);
    NSLog(@"positionDisplay res received: %@",res);
    
    if (err == nil){
        // no error, parse data
        NSDictionary *resJSON = [NSJSONSerialization JSONObjectWithData:reqData
                                                                options:kNilOptions
                                                                  error:&err];
        
        if (resJSON[@"next"] == nil){
            NSLog(@"no \"next\" key detected");
            self.mode = 1;
            
        } else {
            NSLog(@"%@",err);
            NSLog(@"positionDisplay received: %@",resJSON);
            
            NSLog(@"screens: %@",self.screens);
            
            NSMutableDictionary *foo = [@{@"displayID":resJSON[@"next"][@"id"],
                                          @"point":@"NA"
                                          } mutableCopy];
            
            NSLog(@"new screen: %@",foo);
            
            [self.screens addObject:foo];
        }
    } else {
        NSLog(@"ERROR: %@",err);
    }
}

- (NSString *)joinRoom:(NSString *)roomID :(NSString *)deviceID {
    // append /device/roomID to the server URL
    NSURL *joinRoomURL = [self.serverURL URLByAppendingPathComponent:@"/device/join"];
    NSLog(@"Joining room with URL %@",joinRoomURL);
    
    NSDictionary *dictWithJSONObject = @{@"roomID":roomID,
                                         @"deviceID":deviceID,
                                         };
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
    
    NSLog(@"joinRoom request data: %@",reqData);
    
    self.navigationItem.title = self.roomID;
    
    if (err == nil){
        return [NSString stringWithFormat:@"%@/device/room/%@",self.serverURL,roomID];
    } else {
        return @"ERROR";
    }
}

/*
 * SCREENS METHODS
 */

- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event{
    NSLog(@"Touch end detected");
    NSLog(@"mode %i",self.mode);
    
    if (self.mode == 0){
        // add screens mode

        // updated point for latest screen
        CGPoint endPoint = [[touches anyObject] locationInView:self.view];
        
        [[self.screens lastObject] setObject:[NSValue valueWithCGPoint:endPoint]
                                      forKey:@"point"];
        
        // send synchronous get request
        [self positionDisplay];
        
    } else if (self.mode == 1){
        // sending and getting data mode
        

    }
}

- (NSDictionary *)closestScreenForPoint:(CGPoint)point {
    NSDictionary *closestScreen = nil;
    float closestDist = MAXFLOAT;
    
    for (NSDictionary *screen in self.screens){
        CGPoint scg = [[screen valueForKey:@"point"] CGPointValue];
        
        CGFloat dx = (scg.x-point.x);
        CGFloat dy = (scg.x-point.y);
        CGFloat dist = sqrt((dx*dx)+(dy*dy));

        if (dist < closestDist){
            closestDist = dist;
            closestScreen = screen;
        }
    }
    
    return closestScreen;
}


@end
