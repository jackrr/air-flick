//
//  NARoomViewController.m
//  airflick
//
//  Created by Nathan Teetor on 4/7/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NARoomViewController.h"
#import "UIColor+Expanded.h"
#import "NARoomView.h"
#import "NASineShape.h"
#import <QuartzCore/QuartzCore.h>

@interface NARoomViewController () <NSURLConnectionDelegate>

@property NSString *deviceID;
@property NSString *roomID;
@property NSURL *serverURL;

@property NSMutableArray *screens;
//@property NSMutableArray *screenColors;

//@property int mode; // -1=initial, 0=setup, 1=send/get
@property int swipeType; // 0=send, 1=get
@property int moveCircle; // 0=no, 1=yes

//@property CGPoint touchStartsAt;
//@property NSDate *timeTouchBegan;

@property CGPoint touchStart;
@property CGPoint touchEnd;

@property float lastScale;

@property NSArray *sineShapes;
@property NASineShape *currentShape;
@property int sineIndex;



@end

@implementation NARoomViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
        
        [self.view setNeedsDisplay];
        
        self.screens = [NSMutableArray new];
        
        self.serverURL = [[NSURL alloc] initWithString:@"http://photoplace.cs.oberlin.edu"];
        
        // get and set the device ID
        self.deviceID = [[[UIDevice currentDevice] identifierForVendor] UUIDString];
        
        UISwipeGestureRecognizer *swipeRight = [[UISwipeGestureRecognizer alloc]
                                                initWithTarget:self
                                                action:@selector(horizontalSwipeRight:)];
        swipeRight.direction = UISwipeGestureRecognizerDirectionRight;
        swipeRight.cancelsTouchesInView = NO;
        [self.view addGestureRecognizer:swipeRight];
        
        UISwipeGestureRecognizer *swipeLeft = [[UISwipeGestureRecognizer alloc]
                                               initWithTarget:self
                                               action:@selector(horizontalSwipeLeft:)];
        swipeLeft.direction = UISwipeGestureRecognizerDirectionLeft;
        swipeLeft.cancelsTouchesInView = NO;
        [self.view addGestureRecognizer:swipeLeft];
        
        UIPinchGestureRecognizer *pinchRecognizer = [[UIPinchGestureRecognizer alloc]
                                                     initWithTarget:self
                                                     action:@selector(scaleShape:)];
        [self.view addGestureRecognizer:pinchRecognizer];
        
        UISwipeGestureRecognizer *swipeUp = [[UISwipeGestureRecognizer alloc]
                                             initWithTarget:self
                                             action:@selector(verticalSwipeUp:)];
        swipeUp.direction = UISwipeGestureRecognizerDirectionUp;
        [self.view addGestureRecognizer:swipeUp];
        
        UISwipeGestureRecognizer *swipeDown = [[UISwipeGestureRecognizer alloc]
                                               initWithTarget:self
                                               action:@selector(verticalSwipeDown:)];
        swipeDown.direction = UISwipeGestureRecognizerDirectionDown;
        [self.view addGestureRecognizer:swipeDown];
        
        
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
        
//        self.mode = -1; // start/waiting mode
        
        self.sineShapes = @[[[NASineShape alloc] initWithShape:@"diamond"],
                            [[NASineShape alloc] initWithShape:@"circle"],
                            [[NASineShape alloc] initWithShape:@"square"]];
        
        for (NASineShape *s in self.sineShapes){
            s.parentClass = self;
        }
        self.sineIndex = 0;
        
        for (UIGestureRecognizer *gr in self.view.gestureRecognizers){
            gr.enabled = NO;
        }
        
        UIPanGestureRecognizer *panRecognizer = [[UIPanGestureRecognizer alloc]
                                              initWithTarget:self
                                              action:@selector(panHandler:)];
        [self.view addGestureRecognizer:panRecognizer];
        NSLog(@"pan recognizer enabled: %hhd",panRecognizer.isEnabled);
        
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

- (void)scaleShape:(UIPinchGestureRecognizer *)pr
{
    if (pr.state == UIGestureRecognizerStateBegan){
        self.lastScale = pr.scale;
    }
    
    if (pr.state == UIGestureRecognizerStateEnded) {
        float wtf = self.currentShape.frame.size.height/10*1000;
        NSLog(@"wtf: %f",wtf);
        [self.currentShape updateDuration:wtf];
        NSLog(@"duration: %@",self.currentShape.duration);
    }
    
    self.currentShape.transform = CGAffineTransformScale(self.currentShape.transform,
                                                         pr.scale, pr.scale);
    pr.scale = 1;
}

- (void)verticalSwipeUp:(UISwipeGestureRecognizer *)sr
{
    NSLog(@"swipe up detected");
    [self.currentShape changeValue:sr.direction];
}

- (void)verticalSwipeDown:(UISwipeGestureRecognizer *)sr
{
    NSLog(@"swipe down direction");
    [self.currentShape changeValue:sr.direction];
}

- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event
{
    self.touchStart = [[touches anyObject] locationInView:self.view];
}

- (void)horizontalSwipeRight:(UISwipeGestureRecognizer *)sr
{
    NSLog(@"swipe right detected");
    
    if (!CGRectContainsPoint(self.currentShape.frame, self.touchStart)){
        self.sineIndex = (self.sineIndex+1) % self.sineShapes.count;
        CGPoint oldCenter = self.currentShape.center;
        [self.currentShape removeFromSuperview];
        self.currentShape = self.sineShapes[self.sineIndex];
        [self.view addSubview:self.currentShape];
        self.currentShape.center = oldCenter;
    }
}

- (void)horizontalSwipeLeft:(UISwipeGestureRecognizer *)sr
{
    NSLog(@"swipe left detected");
    
    if (!CGRectContainsPoint(self.currentShape.frame, self.touchStart)){
        self.sineIndex = (self.sineIndex-1+self.sineShapes.count) % self.sineShapes.count;
        CGPoint oldCenter = self.currentShape.center;
        [self.currentShape removeFromSuperview];
        self.currentShape = self.sineShapes[self.sineIndex];
        [self.view addSubview:self.currentShape];
        self.currentShape.center = oldCenter;
    }
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
    
}

- (void)sendShapeToScreen:(NSDictionary *)shapeAsDict :(NSDictionary *)screen
{
    NSLog(@"beginning of sendShapeToScreen");
    
    if (screen)
        NSLog(@"screen is still not nil");
    if (shapeAsDict)
        NSLog(@"shape as dictionary is not nil");
    
    NSLog(@"(this could be a problem) screen: %@",screen);
    
    [self sendJSONtoPath:[NSString stringWithFormat:@"/device/room/%@",self.roomID]
                        :@{ @"action":shapeAsDict,
                            @"deviceID":self.deviceID,
                            @"displayID":screen[@"displayID"] }];
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
//    self.mode = 0;
    self.navigationItem.rightBarButtonItem.enabled = NO;
    [self positionDisplay];
}

- (void)panHandler:(UIPanGestureRecognizer *)pr
{
    if (self.navigationItem.rightBarButtonItem.isEnabled){
        return;
    }
    
    NSLog(@"PAN HANDLER CALLED");
    if (pr.state == UIGestureRecognizerStateBegan){
        self.touchStart = [pr locationInView:self.view];
    }
    else if (pr.state == UIGestureRecognizerStateEnded){
        if ([self distFormula:self.touchStart
                             :CGPointMake(self.view.bounds.size.width/2.0,
                                          self.view.bounds.size.height/2.0+44.0)] > self.view.bounds.size.width/3.0)
        {
            [[[UIAlertView alloc] initWithTitle:@"Whoops!"
                                        message:@"Make sure to start your swipes inside the circle."
                                       delegate:self
                              cancelButtonTitle:@"OK"
                              otherButtonTitles:nil]
             show];
            return;
        }
        
        self.touchEnd = [pr locationInView:self.view];
        
        float dx = -1*(self.touchStart.x - self.touchEnd.x);
        float dy = -1*(self.touchStart.y - self.touchEnd.y);
        
        float normalize = [self distFormula:self.touchStart :self.touchEnd];
        float r = 300.0; // height should equal width
        
        CGPoint finalPoint = CGPointMake(self.touchStart.x+(r*dx/normalize),
                                         self.touchStart.y+(r*dy/normalize));
        NSLog(@"finalPoint: %@",NSStringFromCGPoint(finalPoint));
        
        [[self.screens lastObject] setObject:[NSValue valueWithCGPoint:finalPoint]
                                      forKey:@"point"];
        
        NSLog(@"screen updated: %@",[self.screens lastObject]);
        
        [self positionDisplay];
    }
}

- (void)positionDisplay
{
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
            
            for (UIGestureRecognizer *gr in self.view.gestureRecognizers){
                gr.enabled = !gr.enabled;
            }
            
            self.currentShape = [self.sineShapes objectAtIndex:self.sineIndex];
            self.currentShape.center = CGPointMake(self.view.bounds.size.width/2.0,
                                                   self.view.bounds.size.height/2.0+44.0);
            
            NSLog(@"shape center: %@",NSStringFromCGPoint(self.currentShape.center));
            [self.view addSubview:self.currentShape];
            
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


- (NSMutableDictionary *)closestScreenToPoint:(CGPoint)point {
    
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
    
    if (closestScreen)
        NSLog(@"closest screen is not nil");
    
    return closestScreen;
}

- (CGFloat)distFormula:(CGPoint)p1 :(CGPoint)p2{
    CGFloat dx = p1.x-p2.x;
    CGFloat dy = p1.y-p2.y;
    return sqrt((dx*dx)+(dy*dy));
}



@end
