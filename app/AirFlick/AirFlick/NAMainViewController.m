//
//  NAMainViewController.m
//  airflick
//
//  Created by Nathan Teetor on 3/28/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NAMainViewController.h"
#import "NACard.h"

@interface NAMainViewController ()

@property (nonatomic) IBOutlet UIView *subView;

@property NACard *currentCard;

@property (nonatomic) NSString *deviceID;
@property (nonatomic) NSString *serverURL;
@property (nonatomic) NSString *roomID;
           
@property (nonatomic, weak) IBOutlet UILabel *sendRequestLabel;

@property (nonatomic, strong) IBOutlet UISwipeGestureRecognizer *swipeRightRecognizer;
@property (nonatomic, strong) IBOutlet UISwipeGestureRecognizer *swipeLeftRecognizer;
@property (nonatomic, strong) IBOutlet UISwipeGestureRecognizer *swipeUpRecognizer;

@end

@implementation NAMainViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    // load self, or whatever
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    
    if (self) {
        
        //self.serverURL = @"http://localhost:3000/device/hello";

        // get device id
        self.deviceID = [[[UIDevice currentDevice] identifierForVendor] UUIDString];

        [self establishDeviceToRoomConnection];
    
        NSLog(@"Connected to %@",self.serverURL);
        [self addCard];
    }
    
    // return the main view
    return self;
}

- (void)establishDeviceToRoomConnection {
    // request room ID
    NSURL *joinRoomURL = [NSURL URLWithString:@"http://photoplace.cs.oberlin.edu/device/join"];
    NSMutableURLRequest *reqForRoomID = [[NSMutableURLRequest alloc] init];
    [reqForRoomID setURL:joinRoomURL];
    [reqForRoomID setHTTPMethod:@"POST"];
    [reqForRoomID setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [reqForRoomID setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    
    NSDictionary *temp = [NSDictionary dictionaryWithObjectsAndKeys:
                         @"room1",@"roomID",
                         self.deviceID,@"deviceID",
                          nil];
    NSLog(@"connection dictionary: %@",temp);
    
    [reqForRoomID setHTTPBody: [NSJSONSerialization
                                dataWithJSONObject:temp
                                options:kNilOptions error:nil]];
    
    NSURLResponse *joinReqResponse = nil;
    NSError *joinReqError = nil;
    NSData *joinReqData = [NSURLConnection sendSynchronousRequest:reqForRoomID
                                                returningResponse:&joinReqResponse
                                                            error:&joinReqError];
    if (joinReqError == nil){
        //            NSDictionary *joinResJSON = [NSJSONSerialization JSONObjectWithData:joinReqData
        //                                                                        options:0
        //                                                                          error:nil];
        self.serverURL = @"http://photoplace.cs.oberlin.edu/device/room/room1";
    } else {
        [[[UIAlertView alloc] initWithTitle:@"Whoops!"
                                    message:@"Could not connect to room1. Connecting to localhost instead."
                                   delegate:nil
                          cancelButtonTitle:@"OK"
                          otherButtonTitles:nil] show];
        
        self.serverURL = @"http://localhost:3000/device/hello";
    }
}

- (IBAction)reconnectDevice:(id)sender {
    [self establishDeviceToRoomConnection];
}

// request methods (you tell me)

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    // A response has been received, this is where we initialize the instance var you created
    // so that we can append data to it in the didReceiveData method
    // Furthermore, this method is called each time there is a redirect so reinitializing it
    // also serves to clear it
    _responseData = [[NSMutableData alloc] init];
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    // Append the new data to the instance variable you declared
    [_responseData appendData:data];
}

- (NSCachedURLResponse *)connection:(NSURLConnection *)connection willCacheResponse:(NSCachedURLResponse*)cachedResponse {
    // Return nil to indicate not necessary to store a cached response for this connection
    return nil;
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
    // The request is complete and data has been received
    // You can parse the stuff in your instance variable now
    
//    NSString *msg = [NSString stringWithFormat:@"%@",_responseData];
    //NSDictionary *jsonObj = [NSJSONSerialization JSONObjectWithData:_responseData options:0 error:nil];
    //NSString *msg = [jsonObj valueForKey:@"message"]; //[NSString stringWithFormat:@"%@",jsonObj];
    
    //UIAlertView *receivedData = [[UIAlertView alloc] initWithTitle:@"Data Received" message:msg delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
    
    //[receivedData show];
    NSLog(@"Card sent succesfully");

    //[self.currentCard transitionLeft];
    [self addCard];
   }

- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    // The request has failed for some reason!
    // Check the error var
    
    // throws error aka DOES NOT WORK
    
    NSLog(@"%@",[NSString stringWithFormat:@"Connection failed: %@",error]);
}

- (void)sendJSONtoServer:(NSDictionary *)dict {
    // set URL
    NSLog(@"Sending card to %@",self.serverURL);
    NSURL *url = [NSURL URLWithString:self.serverURL];
    
    NSLog(@"Dictionary to be sent: %@",dict);
    
    // convert NSDictionary to NSData
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dict options:kNilOptions error:nil];
    
    // construct request
    NSMutableURLRequest *req = [[NSMutableURLRequest alloc] init];
    [req setURL:url];
    [req setHTTPMethod:@"POST"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    [req setHTTPBody:jsonData];
    
    // construct connection
    NSURLConnection *conn = [[NSURLConnection alloc] initWithRequest:req delegate:self];
}

- (void)sendCardtoServer:(NSString *)direction {
    NSString *cardColor = self.currentCard.typeColor;
    
    [self sendJSONtoServer:[NSDictionary dictionaryWithObjectsAndKeys:
                            self.deviceID,@"deviceID",
                            [NSDictionary dictionaryWithObjectsAndKeys:
                             cardColor,@"color",
                             nil],@"block",
                            direction,@"direction",
                            nil]];
    
}

- (IBAction)swipeRightResponder:(UISwipeGestureRecognizer *)sr {
    NSLog(@"Swipe right detected");
    
//    NSDictionary *dict = [NSDictionary dictionaryWithObjectsAndKeys:@"right", @"direction", nil];
//    [self sendJSONtoServer:dict];
    [self sendCardtoServer:@"right"];
    
}

- (IBAction)swipeLeftResponder:(UISwipeGestureRecognizer *)sr {
    NSLog(@"Swipe left detected");

    [self sendCardtoServer:@"left"];

}

- (IBAction)swipeUpResponder:(UISwipeGestureRecognizer *)sr {
    NSLog(@"Swipe up detected");

    [self sendCardtoServer:@"up"];
    
}

- (void)addCard {
    self.currentCard = [[NACard alloc] initWithParentView:self.view];
    [self.currentCard display];
    
    //NSLog(@"%@",[self.view subviews]);
}

@end
