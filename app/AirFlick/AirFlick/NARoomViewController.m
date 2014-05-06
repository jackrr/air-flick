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
#import "NARoomView.h"
#import <QuartzCore/QuartzCore.h>

@interface NARoomViewController () <NSURLConnectionDelegate>

@property NSString *deviceID;
@property NSString *roomID;
@property NSURL *serverURL;

@property NSMutableArray *screens;
//@property NSMutableArray *screenColors;

@property NAColorsClass *obj;
@property (nonatomic) UIView *colorCircle;

@property int mode; // -1=initial, 0=setup, 1=send/get
@property int swipeType; // 0=send, 1=get
@property int moveCircle; // 0=no, 1=yes

@property CGPoint touchStartsAt;
@property NSDate *timeTouchBegan;

@end

@implementation NARoomViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
        _obj = [NAColorsClass getInstance];
        
        [self.view setNeedsDisplay];
        
        self.screens = [NSMutableArray new];
        
//        self.screenColors = [[NSMutableArray alloc]
//                             initWithObjects:_obj.color1,_obj.color2,_obj.color3,nil];
//
//        NSLog(@"%@",self.screenColors);
        
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

- (void)loadView {
    NSLog(@"view loading");
    
    // create a view
    NARoomView *backgroundView = [[NARoomView alloc] init];
    
    // replace view
    self.view = backgroundView;
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
    
    if (self.mode == 0){
        // adding screens mode
        
    }
    
}

- (void)sendJSONtoPath:(NSString *)urlPath :(NSDictionary *)dictWithJSONObject {
    NSURL *url = [self.serverURL URLByAppendingPathComponent:urlPath];
    
    NSLog(@"Sending POST request to %@",url);
    NSLog(@"JSON object: %@",dictWithJSONObject);
    
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
    
    if (err == nil){
        // no error, parse data
        NSDictionary *resJSON = [NSJSONSerialization JSONObjectWithData:reqData
                                                                options:kNilOptions
                                                                  error:&err];
        
        if (resJSON[@"next"] == nil){
            NSLog(@"no \"next\" key detected");
            self.mode = 1;
            
            // TODO: add draggable sub view
            CGRect bounds = self.view.bounds;
            float size = bounds.size.width/4.0;
            //
            CGRect frame = CGRectMake(0,0,size,size);
            self.colorCircle = [[UIView alloc] initWithFrame:frame];
            self.colorCircle.center = CGPointMake(bounds.origin.x+(bounds.size.width/2.0),
                                                  bounds.origin.y+bounds.size.height-size);
            [self setRoundedView:self.colorCircle toDiameter:size];
            self.colorCircle.layer.borderColor = [UIColor blackColor].CGColor;
            self.colorCircle.layer.borderWidth = 1.5;
            self.colorCircle.backgroundColor = [_obj getColor];
            [self.view addSubview:self.colorCircle];
            
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

- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event{
    CGPoint startPoint = [[touches anyObject] locationInView:self.view];

    CGRect bounds = self.view.bounds;
    CGPoint center;
    center.x = bounds.origin.x + bounds.size.width/2.0;
    center.y = bounds.origin.y + bounds.size.height;
    
    if ([self pointInside:startPoint withEvent:nil]){
        self.timeTouchBegan = [NSDate date];
        self.touchStartsAt = startPoint;
        self.moveCircle = 1;
    } else {
        self.moveCircle = 0;
    }
    
    CGFloat dist = [self distFormula:startPoint :center];
    
    NSLog(@"distance from center: %f",dist);
    
    if (dist < (bounds.size.width/2.0)){
        NSLog(@"within send circle");
        
        self.swipeType = 0;
    } else {
        NSLog(@"outside send circle");

        self.swipeType = 1;
    }
    
}

- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event{
    if (self.moveCircle){
        UITouch *touch = [touches anyObject];
        CGPoint location = [touch locationInView:self.view];
        CGPoint previousLocation = [touch previousLocationInView:self.view];
        self.colorCircle.frame = CGRectOffset(self.colorCircle.frame,
                                              (location.x - previousLocation.x),
                                              (location.y - previousLocation.y));
    }
}

- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event{
    NSLog(@"Touch end detected");
    NSLog(@"mode %i",self.mode);
    NSLog(@"touches: %@",touches);
    
    CGPoint endPoint = [[touches anyObject] locationInView:self.view];
    
    if (self.mode == 0 && self.swipeType == 0){
        // add screens mode, swipe started inside circle: add screen
        
        // update point for latest screen
        [[self.screens lastObject] setObject:[NSValue valueWithCGPoint:endPoint]
                                      forKey:@"point"];
        
        //        [self drawRect:endPoint];
        
        // send synchronous get request
        [self positionDisplay];
        
    }
    else if (self.mode == 0 && self.swipeType == 1){
        // add screens mode, swipe started outside of circle: alert user to error
        
        [[[UIAlertView alloc] initWithTitle:@"Whoops!"
                                    message:@"Make sure to start your swipes inside the circle."
                                   delegate:self
                          cancelButtonTitle:@"OK"
                          otherButtonTitles:nil]
         show];
    }
    else if (self.mode == 1 && self.swipeType == 0 && self.moveCircle == 1){
        // data mode, swipe started inside cirle: send data!
        
        NSMutableDictionary *closestScreen = [self closestScreenForPoint:endPoint];
        
        [self sendJSONtoPath:[NSString stringWithFormat:@"/device/room/%@",self.roomID]
                            :@{@"block":@{@"color":[self.colorCircle.backgroundColor hexStringValue]},
                               @"displayID":closestScreen[@"displayID"],
                               @"deviceID":self.deviceID}];
        
        CGFloat dist = [self distFormula:endPoint :self.touchStartsAt];
        NSLog(@"dist: %f",dist);
        NSTimeInterval time = [[NSDate date] timeIntervalSinceDate:self.timeTouchBegan];
        NSLog(@"time: %f",time);
        float velocity = dist/time;
        NSLog(@"velocity: %f",velocity);

        float slope = (self.touchStartsAt.y-endPoint.y)/(self.touchStartsAt.x-endPoint.x);
        float newX = (-endPoint.y/slope)+endPoint.x;
        
        // is this actually how I was supposed to be calculating duration? probably...
        float travelDist = [self distFormula:CGPointMake(newX,0) :endPoint];
        float dur = travelDist/velocity;
        NSLog(@"actualDur?: %f",dur);
        
        [UIView animateWithDuration:dur
                              delay:0.0
                            options:UIViewAnimationOptionCurveEaseOut
                         animations:^{
                            // float x = self.view.bounds.size.width/2.0;
                             float y = 0;
                             self.colorCircle.center = CGPointMake(newX,y);
                         }
                         completion:^(BOOL finished) {
                             [self resetFrame];
                         }];
        
        //[self resetFrame];
    }
    else if (self.mode == 1 && self.swipeType == 1){
        // data mode, swipe started outside of circle: get data!
        
        
    }

}

- (NSMutableDictionary *)closestScreenForPoint:(CGPoint)point {
    
    NSMutableDictionary *closestScreen = nil;
    float closestDist = MAXFLOAT;
    
    for (NSMutableDictionary *screen in self.screens){
        CGPoint scg = [[screen valueForKey:@"point"] CGPointValue];
        
        CGFloat dist = [self distFormula:point :scg];

        if (dist < closestDist){
            closestDist = dist;
            closestScreen = screen;
        }
    }
    
    return closestScreen;
}

- (CGFloat)distFormula:(CGPoint)p1 :(CGPoint)p2{
    CGFloat dx = p1.x-p2.x;
    CGFloat dy = p1.y-p2.y;
    return sqrt((dx*dx)+(dy*dy));
}

/*
 * CIRCLE VIEW FUNCTIONS
 */
-(void)setRoundedView:(UIView *)roundedView toDiameter:(float)newSize;
{
    CGPoint saveCenter = roundedView.center;
    CGRect newFrame = CGRectMake(roundedView.frame.origin.x, roundedView.frame.origin.y, newSize, newSize);
    roundedView.frame = newFrame;
    roundedView.layer.cornerRadius = newSize / 2.0;
    roundedView.center = saveCenter;
}

- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event
{
    return CGRectContainsPoint(self.colorCircle.frame, point);
}

- (void)resetFrame {
    CGRect bounds = self.view.bounds;
    float size = bounds.size.width/4.0;
    CGRect frame = CGRectMake(bounds.origin.x+(bounds.size.width/2.0)-(size/2.0),
                              bounds.origin.y+bounds.size.height-size-20.0,
                              size, size);
    [self.colorCircle setFrame:frame];
    self.colorCircle.backgroundColor = [_obj getColor];
}


@end
